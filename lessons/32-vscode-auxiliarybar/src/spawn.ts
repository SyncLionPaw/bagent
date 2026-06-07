import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import * as path from "node:path";
import type { AgentEvent } from "./events";

type WorkerRequest =
  | { op: "chat"; message: string }
  | { op: "approve"; allow: boolean }
  | { op: "shutdown" };

export class AgentProcess {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private rl: Interface | null = null;
  private turnWait: {
    onEvent: (e: AgentEvent) => void;
    resolve: () => void;
    reject: (err: Error) => void;
  } | null = null;

  start(extensionPath: string, cwd: string, agentEnv: Record<string, string>): void {
    const workerPath = path.join(extensionPath, "out", "agent", "worker.js");
    this.proc = spawn(process.execPath, [workerPath], {
      cwd,
      env: { ...process.env, ...agentEnv },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.rl = createInterface({ input: this.proc.stdout });

    this.rl.on("line", (line) => {
      if (!this.turnWait) return;
      let event: AgentEvent;
      try {
        event = JSON.parse(line) as AgentEvent;
      } catch {
        return;
      }
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
      this.proc = null;
    });
  }

  async chat(message: string, onEvent: (e: AgentEvent) => void): Promise<void> {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动（检查 API Key 与 ch32:compile）");
    }
    if (this.turnWait) {
      throw new Error("上一轮尚未结束");
    }

    await new Promise<void>((resolve, reject) => {
      this.turnWait = { onEvent, resolve, reject };
      const req: WorkerRequest = { op: "chat", message };
      this.proc!.stdin!.write(`${JSON.stringify(req)}\n`);
    });
  }

  approve(allow: boolean): void {
    if (!this.proc?.stdin) {
      throw new Error("Agent 子进程未启动");
    }
    const req: WorkerRequest = { op: "approve", allow };
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
  }
}
