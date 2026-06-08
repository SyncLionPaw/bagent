import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import * as path from "node:path";
import type { AgentEvent } from "./events";

type WorkerRequest =
  | { op: "chat"; message: string }
  | { op: "approve"; allow: boolean }
  | { op: "edit_apply"; allow: boolean }
  | { op: "ask_user_answer"; answer: string }
  | { op: "ask_user_skip" }
  | { op: "set_model"; model: string }
  | { op: "save_chat"; name?: string }
  | { op: "load_chat"; name?: string }
  | { op: "list_chats" }
  | { op: "shutdown" };

export type SaveChatResponse =
  | { ok: true; name: string; path: string; messages: number }
  | { ok: false; error: string };

export type LoadChatResponse =
  | { ok: true; name: string; path: string; messages: number }
  | { ok: false; error: string };

export type SessionReadyInfo = {
  sessionId: string;
  restored: boolean;
  messages: number;
  path?: string;
};

type WorkerResult =
  | { type: "WorkerResult"; op: "save_chat"; ok: true; name: string; path: string; messages: number }
  | { type: "WorkerResult"; op: "save_chat"; ok: false; error: string }
  | { type: "WorkerResult"; op: "load_chat"; ok: true; name: string; path: string; messages: number }
  | { type: "WorkerResult"; op: "load_chat"; ok: false; error: string }
  | { type: "WorkerResult"; op: "list_chats"; text: string };

type WorkerLine =
  | AgentEvent
  | WorkerResult
  | ({ type: "SessionReady" } & SessionReadyInfo);

export class AgentProcess {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private rl: Interface | null = null;
  private turnWait: {
    onEvent: (e: AgentEvent) => void;
    resolve: () => void;
    reject: (err: Error) => void;
  } | null = null;
  private opWait: {
    resolve: (r: WorkerResult) => void;
    reject: (err: Error) => void;
  } | null = null;
  private sessionReadyResolve: ((info: SessionReadyInfo) => void) | null = null;
  readonly sessionReady: Promise<SessionReadyInfo>;

  constructor() {
    this.sessionReady = new Promise((resolve) => {
      this.sessionReadyResolve = resolve;
    });
  }

  start(extensionPath: string, cwd: string, agentEnv: Record<string, string>): void {
    const workerPath = path.join(extensionPath, "out", "agent", "worker.js");
    this.proc = spawn(process.execPath, [workerPath], {
      cwd,
      env: { ...process.env, ...agentEnv },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.rl = createInterface({ input: this.proc.stdout });

    this.rl.on("line", (line) => {
      let parsed: WorkerLine;
      try {
        parsed = JSON.parse(line) as WorkerLine;
      } catch {
        return;
      }

      if (parsed.type === "SessionReady") {
        const { sessionId, restored, messages, path: filePath } = parsed;
        this.sessionReadyResolve?.({ sessionId, restored, messages, path: filePath });
        this.sessionReadyResolve = null;
        return;
      }

      if (parsed.type === "WorkerResult") {
        const { resolve } = this.opWait ?? {};
        this.opWait = null;
        resolve?.(parsed);
        return;
      }

      if (!this.turnWait) return;
      const event = parsed as AgentEvent;
      this.turnWait.onEvent(event);
      if (event.type === "TurnEnd") {
        const { resolve } = this.turnWait;
        this.turnWait = null;
        resolve();
      }
    });

    this.proc.stderr.on("data", (buf) => {
      console.error("[bagent agent]", buf.toString().trimEnd());
    });

    this.proc.on("exit", (code) => {
      if (this.turnWait) {
        this.turnWait.reject(new Error(`Agent 子进程退出 code=${code ?? "?"}`));
        this.turnWait = null;
      }
      if (this.opWait) {
        this.opWait.reject(new Error(`Agent 子进程退出 code=${code ?? "?"}`));
        this.opWait = null;
      }
      this.proc = null;
    });
  }

  private sendOp<T extends WorkerResult>(req: WorkerRequest): Promise<T> {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动（检查 API Key 与 ch53:compile）");
    }
    if (this.turnWait) {
      throw new Error("上一轮尚未结束，请稍后再试");
    }
    if (this.opWait) {
      throw new Error("另有操作进行中");
    }

    return new Promise<T>((resolve, reject) => {
      this.opWait = {
        resolve: (r) => resolve(r as T),
        reject,
      };
      this.proc!.stdin!.write(`${JSON.stringify(req)}\n`);
    });
  }

  async chat(message: string, onEvent: (e: AgentEvent) => void): Promise<void> {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动（检查 API Key 与 ch53:compile）");
    }
    if (this.turnWait) {
      throw new Error("上一轮尚未结束");
    }
    if (this.opWait) {
      throw new Error("另有操作进行中");
    }

    await new Promise<void>((resolve, reject) => {
      this.turnWait = { onEvent, resolve, reject };
      const req: WorkerRequest = { op: "chat", message };
      this.proc!.stdin!.write(`${JSON.stringify(req)}\n`);
    });
  }

  async saveChat(name?: string): Promise<SaveChatResponse> {
    const res = await this.sendOp<Extract<WorkerResult, { op: "save_chat" }>>({
      op: "save_chat",
      name,
    });
    if (res.ok) {
      return { ok: true, name: res.name, path: res.path, messages: res.messages };
    }
    return { ok: false, error: res.error };
  }

  async loadChat(name?: string): Promise<LoadChatResponse> {
    const res = await this.sendOp<Extract<WorkerResult, { op: "load_chat" }>>({
      op: "load_chat",
      name,
    });
    if (res.ok) {
      return { ok: true, name: res.name, path: res.path, messages: res.messages };
    }
    return { ok: false, error: res.error };
  }

  async listChats(): Promise<string> {
    const res = await this.sendOp<Extract<WorkerResult, { op: "list_chats" }>>({
      op: "list_chats",
    });
    return res.text;
  }

  approve(allow: boolean): void {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动");
    }
    const req: WorkerRequest = { op: "approve", allow };
    this.proc.stdin.write(`${JSON.stringify(req)}\n`);
  }

  editApply(allow: boolean): void {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动");
    }
    const req: WorkerRequest = { op: "edit_apply", allow };
    this.proc.stdin.write(`${JSON.stringify(req)}\n`);
  }

  answerAskUser(answer: string): void {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动");
    }
    const req: WorkerRequest = { op: "ask_user_answer", answer };
    this.proc.stdin.write(`${JSON.stringify(req)}\n`);
  }

  skipAskUser(): void {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动");
    }
    const req: WorkerRequest = { op: "ask_user_skip" };
    this.proc.stdin.write(`${JSON.stringify(req)}\n`);
  }

  setModel(model: string): void {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动");
    }
    const req: WorkerRequest = { op: "set_model", model };
    this.proc.stdin.write(`${JSON.stringify(req)}\n`);
  }

  shutdown(): void {
    if (this.proc?.stdin) {
      this.proc.stdin.write(
        `${JSON.stringify({ op: "shutdown" } satisfies WorkerRequest)}\n`,
      );
    }
    this.proc?.kill();
    this.rl?.close();
    this.proc = null;
    this.turnWait = null;
    this.opWait = null;
  }
}
