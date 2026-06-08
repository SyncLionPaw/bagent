import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { Messages } from "./messages.js";

export const BAGENT_HOME = join(homedir(), ".bagent");
export const CHAT_NAME_MAX_CHARS = 64;
export const CHAT_FORMAT_VERSION = 1;

export type ChatPayload = {
  version: number;
  kind: "archive" | "session";
  sessionId?: string;
  savedAt: string;
  project: string;
  cwd: string;
  messages: Messages;
};

function sanitizeSegment(raw: string, fallback: string): string {
  const s = raw.trim().replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
  return s || fallback;
}

export function projectName(cwd = process.cwd()): string {
  return sanitizeSegment(basename(resolve(cwd)), "project");
}

export function sanitizeChatName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > CHAT_NAME_MAX_CHARS) return null;
  const s = sanitizeSegment(trimmed, "");
  return s || null;
}

export function newSessionId(): string {
  const d = new Date();
  return `session-${d.toISOString().slice(0, 16).replace(/[T:]/g, "-")}`;
}

export function defaultArchiveName(): string {
  const d = new Date();
  return `chat-${d.toISOString().slice(0, 16).replace(/[T:]/g, "-")}`;
}

/** 手动命名存档 ~/.bagent/{项目}/chats/ */
export function chatsDir(cwd = process.cwd()): string {
  return join(BAGENT_HOME, projectName(cwd), "chats");
}

/** 自动会话 ~/.bagent/{项目}/sessions/ */
export function sessionsDir(cwd = process.cwd()): string {
  return join(BAGENT_HOME, projectName(cwd), "sessions");
}

export function archiveFilePath(name: string, cwd = process.cwd()): string {
  const safe = sanitizeChatName(name);
  if (!safe) throw new Error("invalid chat name");
  return join(chatsDir(cwd), `${safe}.json`);
}

export function sessionFilePath(sessionId: string, cwd = process.cwd()): string {
  const safe = sanitizeChatName(sessionId);
  if (!safe) throw new Error("invalid session id");
  return join(sessionsDir(cwd), `${safe}.json`);
}

export function currentSessionPath(cwd = process.cwd()): string {
  return join(sessionsDir(cwd), "current.json");
}

function writePayload(filePath: string, payload: ChatPayload): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

function buildPayload(
  history: Messages,
  kind: ChatPayload["kind"],
  sessionId: string | undefined,
  cwd: string,
): ChatPayload {
  return {
    version: CHAT_FORMAT_VERSION,
    kind,
    sessionId,
    savedAt: new Date().toISOString(),
    project: projectName(cwd),
    cwd: resolve(cwd),
    messages: history,
  };
}

function parsePayload(raw: string): ChatPayload | null {
  try {
    const data = JSON.parse(raw) as ChatPayload;
    if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
      return null;
    }
    if (data.messages[0]?.role !== "system") return null;
    return data;
  } catch {
    return null;
  }
}

export function readPayloadFile(path: string): ChatPayload | null {
  if (!existsSync(path)) return null;
  return parsePayload(readFileSync(path, "utf-8"));
}

export type SaveChatResult =
  | { ok: true; name: string; path: string; messages: number }
  | { ok: false; error: string };

export type LoadChatResult =
  | { ok: true; name: string; path: string; messages: Messages; count: number }
  | { ok: false; error: string };

/** 手动存档到 chats/ */
export function saveChatArchive(
  history: Messages,
  name?: string,
  cwd = process.cwd(),
): SaveChatResult {
  const userTurns = history.filter((m) => m.role === "user").length;
  if (userTurns === 0) {
    return { ok: false, error: "当前没有可保存的对话（尚无用户消息）" };
  }

  const chatName = sanitizeChatName(name?.trim() || defaultArchiveName());
  if (!chatName) {
    return {
      ok: false,
      error: `name 须为非空标识（≤${CHAT_NAME_MAX_CHARS} 字符，字母数字 _ . -）`,
    };
  }

  const path = archiveFilePath(chatName, cwd);
  mkdirSync(chatsDir(cwd), { recursive: true });
  writePayload(path, buildPayload(history, "archive", undefined, cwd));
  return { ok: true, name: chatName, path, messages: history.length };
}

/** 自动保存到 sessions/{sessionId}.json 与 sessions/current.json */
export function autosaveSession(
  history: Messages,
  sessionId: string,
  cwd = process.cwd(),
): SaveChatResult {
  const userTurns = history.filter((m) => m.role === "user").length;
  if (userTurns === 0) {
    return { ok: false, error: "skip" };
  }

  const dir = sessionsDir(cwd);
  mkdirSync(dir, { recursive: true });
  const payload = buildPayload(history, "session", sessionId, cwd);
  const sessionPath = sessionFilePath(sessionId, cwd);
  const currentPath = currentSessionPath(cwd);
  writePayload(sessionPath, payload);
  writePayload(currentPath, payload);

  return { ok: true, name: sessionId, path: currentPath, messages: history.length };
}

/** 启动时恢复 sessions/current.json */
export function restoreCurrentSession(cwd = process.cwd()): LoadChatResult {
  return loadChatFromPath(currentSessionPath(cwd), "current");
}

/** /load [name]：无 name 读 current；有 name 读 chats/name */
export function loadChatByName(name: string | undefined, cwd = process.cwd()): LoadChatResult {
  if (!name?.trim()) {
    return restoreCurrentSession(cwd);
  }
  const safe = sanitizeChatName(name);
  if (!safe) {
    return { ok: false, error: `无效的 name：${name}` };
  }
  const chatPath = archiveFilePath(safe, cwd);
  if (existsSync(chatPath)) {
    return loadChatFromPath(chatPath, safe);
  }
  const sessionPath = sessionFilePath(safe, cwd);
  if (existsSync(sessionPath)) {
    return loadChatFromPath(sessionPath, safe);
  }
  return { ok: false, error: `未找到存档：${safe}（chats/ 或 sessions/）` };
}

function loadChatFromPath(path: string, label: string): LoadChatResult {
  const payload = readPayloadFile(path);
  if (!payload) {
    return { ok: false, error: `无法解析存档：${path}` };
  }
  return {
    ok: true,
    name: label,
    path,
    messages: payload.messages,
    count: payload.messages.length,
  };
}

export function sessionIdFromCurrent(cwd = process.cwd()): string | null {
  const payload = readPayloadFile(currentSessionPath(cwd));
  return payload?.sessionId ?? null;
}

export function listChatArchives(cwd = process.cwd()): string[] {
  const dir = chatsDir(cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

export function listSessionFiles(cwd = process.cwd()): string[] {
  const dir = sessionsDir(cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "current.json")
    .map((f) => f.slice(0, -5))
    .sort();
}

export function formatSaveList(cwd = process.cwd()): string {
  const archives = listChatArchives(cwd);
  const sessions = listSessionFiles(cwd);
  const lines = [`存档目录：${chatsDir(cwd)}`, `会话目录：${sessionsDir(cwd)}`, ""];

  if (archives.length) {
    lines.push(`手动存档 chats/（${archives.length}）`);
    archives.forEach((n) => lines.push(`· ${n}`));
  } else {
    lines.push("（chats/ 暂无手动存档）");
  }

  lines.push("");
  if (sessions.length) {
    lines.push(`自动会话 sessions/（${sessions.length}）`);
    sessions.forEach((n) => lines.push(`· ${n}`));
  } else {
    lines.push("（sessions/ 暂无历史会话文件）");
  }

  lines.push("", "· current → sessions/current.json（自动保存的最新进度）");
  return lines.join("\n");
}

/** @deprecated use saveChatArchive */
export const saveChatHistory = saveChatArchive;
/** @deprecated use listChatArchives */
export const listChatSaves = listChatArchives;
