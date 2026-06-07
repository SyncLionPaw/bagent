import { createInterface } from "node:readline";
import type { AskUserResult } from "./askUser";
import {
  autosaveSession,
  formatSaveList,
  listChatArchives,
  loadChatByName,
  newSessionId,
  readPayloadFile,
  restoreCurrentSession,
  saveChatArchive,
  sessionIdFromCurrent,
} from "./chatSave.js";
import { AgentLoop } from "./loop";
import type { ToolCall } from "./messages";

type WorkerRequest =
  | { op: "chat"; message: string }
  | { op: "approve"; allow: boolean }
  | { op: "ask_user_answer"; answer: string }
  | { op: "ask_user_skip" }
  | { op: "set_model"; model: string }
  | { op: "save_chat"; name?: string }
  | { op: "load_chat"; name?: string }
  | { op: "list_chats" }
  | { op: "shutdown" };

type WorkerResult =
  | { type: "WorkerResult"; op: "save_chat"; ok: true; name: string; path: string; messages: number }
  | { type: "WorkerResult"; op: "save_chat"; ok: false; error: string }
  | { type: "WorkerResult"; op: "load_chat"; ok: true; name: string; path: string; messages: number }
  | { type: "WorkerResult"; op: "load_chat"; ok: false; error: string }
  | { type: "WorkerResult"; op: "list_chats"; text: string }
  | {
      type: "SessionReady";
      sessionId: string;
      restored: boolean;
      messages: number;
      path?: string;
    };

let currentModel = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
process.env.DEEPSEEK_MODEL = currentModel;

function emit(event: unknown) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("缺少 DEEPSEEK_API_KEY（插件应从 ~/.bagent/deepseek-api-key 注入）");
  process.exit(1);
}

const agent = new AgentLoop();
let busy = false;
let approvalResolve: ((allow: boolean) => void) | null = null;
let askUserResolve: ((result: AskUserResult) => void) | null = null;

let sessionId = newSessionId();
const restored = restoreCurrentSession();
if (restored.ok) {
  agent.replaceHistory(restored.messages);
  const payload = readPayloadFile(restored.path);
  sessionId = payload?.sessionId ?? sessionIdFromCurrent() ?? sessionId;
}

emit({
  type: "SessionReady",
  sessionId,
  restored: restored.ok,
  messages: agent.history.length,
  path: restored.ok ? restored.path : undefined,
});

const AUTOSAVE_MS = 120_000;
let autosaveTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
  if (busy) return;
  autosaveSession(agent.history, sessionId);
}, AUTOSAVE_MS);

function persistSession(): void {
  const result = autosaveSession(agent.history, sessionId);
  if (result.ok) sessionId = result.name;
}

async function approve(_call: ToolCall): Promise<boolean> {
  return new Promise((resolve) => {
    approvalResolve = resolve;
  });
}

async function askUser(_call: ToolCall, _question: string): Promise<AskUserResult> {
  return new Promise((resolve) => {
    askUserResolve = resolve;
  });
}

const rl = createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  let req: WorkerRequest;
  try {
    req = JSON.parse(line) as WorkerRequest;
  } catch {
    return;
  }

  if (req.op === "shutdown") {
    persistSession();
    if (autosaveTimer) clearInterval(autosaveTimer);
    rl.close();
    process.exit(0);
  }

  if (req.op === "approve") {
    approvalResolve?.(req.allow);
    approvalResolve = null;
    return;
  }

  if (req.op === "ask_user_answer") {
    const answer = req.answer.trim();
    if (answer) {
      askUserResolve?.({ answered: true, answer });
    } else {
      askUserResolve?.({ answered: false });
    }
    askUserResolve = null;
    return;
  }

  if (req.op === "ask_user_skip") {
    askUserResolve?.({ answered: false });
    askUserResolve = null;
    return;
  }

  if (req.op === "set_model") {
    const model = req.model.trim();
    if (model) {
      currentModel = model;
      process.env.DEEPSEEK_MODEL = model;
    }
    return;
  }

  if (req.op === "save_chat") {
    const result = saveChatArchive(agent.history, req.name);
    if (result.ok) {
      emit({
        type: "WorkerResult",
        op: "save_chat",
        ok: true,
        name: result.name,
        path: result.path,
        messages: result.messages,
      });
    } else {
      emit({ type: "WorkerResult", op: "save_chat", ok: false, error: result.error });
    }
    return;
  }

  if (req.op === "load_chat") {
    if (busy) {
      emit({
        type: "WorkerResult",
        op: "load_chat",
        ok: false,
        error: "上一轮尚未结束，请稍后再加载",
      });
      return;
    }
    const result = loadChatByName(req.name);
    if (result.ok) {
      agent.replaceHistory(result.messages);
      const payload = readPayloadFile(result.path);
      sessionId =
        payload?.sessionId ??
        (result.name === "current" ? sessionIdFromCurrent() : null) ??
        newSessionId();
      persistSession();
      emit({
        type: "WorkerResult",
        op: "load_chat",
        ok: true,
        name: result.name,
        path: result.path,
        messages: result.count,
      });
    } else {
      emit({ type: "WorkerResult", op: "load_chat", ok: false, error: result.error });
    }
    return;
  }

  if (req.op === "list_chats") {
    emit({
      type: "WorkerResult",
      op: "list_chats",
      text: formatSaveList(),
    });
    return;
  }

  if (req.op !== "chat" || !req.message.trim()) return;
  if (busy) {
    emit({ type: "TurnEnd", text: "错误: 上一轮尚未结束" });
    return;
  }

  busy = true;
  try {
    for await (const event of agent.turn(req.message.trim(), approve, askUser)) {
      emit(event);
    }
    persistSession();
  } catch (err) {
    emit({
      type: "TurnEnd",
      text: `错误: ${err instanceof Error ? err.message : String(err)}`,
    });
  } finally {
    busy = false;
    approvalResolve = null;
    askUserResolve = null;
  }
});
