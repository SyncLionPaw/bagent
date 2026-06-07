"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChatSaves = exports.saveChatHistory = exports.CHAT_FORMAT_VERSION = exports.CHAT_NAME_MAX_CHARS = exports.BAGENT_HOME = void 0;
exports.projectName = projectName;
exports.sanitizeChatName = sanitizeChatName;
exports.newSessionId = newSessionId;
exports.defaultArchiveName = defaultArchiveName;
exports.chatsDir = chatsDir;
exports.sessionsDir = sessionsDir;
exports.archiveFilePath = archiveFilePath;
exports.sessionFilePath = sessionFilePath;
exports.currentSessionPath = currentSessionPath;
exports.readPayloadFile = readPayloadFile;
exports.saveChatArchive = saveChatArchive;
exports.autosaveSession = autosaveSession;
exports.restoreCurrentSession = restoreCurrentSession;
exports.loadChatByName = loadChatByName;
exports.sessionIdFromCurrent = sessionIdFromCurrent;
exports.listChatArchives = listChatArchives;
exports.listSessionFiles = listSessionFiles;
exports.formatSaveList = formatSaveList;
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
exports.BAGENT_HOME = (0, node_path_1.join)((0, node_os_1.homedir)(), ".bagent");
exports.CHAT_NAME_MAX_CHARS = 64;
exports.CHAT_FORMAT_VERSION = 1;
function sanitizeSegment(raw, fallback) {
    const s = raw.trim().replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
    return s || fallback;
}
function projectName(cwd = process.cwd()) {
    return sanitizeSegment((0, node_path_1.basename)((0, node_path_1.resolve)(cwd)), "project");
}
function sanitizeChatName(raw) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > exports.CHAT_NAME_MAX_CHARS)
        return null;
    const s = sanitizeSegment(trimmed, "");
    return s || null;
}
function newSessionId() {
    const d = new Date();
    return `session-${d.toISOString().slice(0, 16).replace(/[T:]/g, "-")}`;
}
function defaultArchiveName() {
    const d = new Date();
    return `chat-${d.toISOString().slice(0, 16).replace(/[T:]/g, "-")}`;
}
/** 手动命名存档 ~/.bagent/{项目}/chats/ */
function chatsDir(cwd = process.cwd()) {
    return (0, node_path_1.join)(exports.BAGENT_HOME, projectName(cwd), "chats");
}
/** 自动会话 ~/.bagent/{项目}/sessions/ */
function sessionsDir(cwd = process.cwd()) {
    return (0, node_path_1.join)(exports.BAGENT_HOME, projectName(cwd), "sessions");
}
function archiveFilePath(name, cwd = process.cwd()) {
    const safe = sanitizeChatName(name);
    if (!safe)
        throw new Error("invalid chat name");
    return (0, node_path_1.join)(chatsDir(cwd), `${safe}.json`);
}
function sessionFilePath(sessionId, cwd = process.cwd()) {
    const safe = sanitizeChatName(sessionId);
    if (!safe)
        throw new Error("invalid session id");
    return (0, node_path_1.join)(sessionsDir(cwd), `${safe}.json`);
}
function currentSessionPath(cwd = process.cwd()) {
    return (0, node_path_1.join)(sessionsDir(cwd), "current.json");
}
function writePayload(filePath, payload) {
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(filePath), { recursive: true });
    (0, node_fs_1.writeFileSync)(filePath, JSON.stringify(payload, null, 2), "utf-8");
}
function buildPayload(history, kind, sessionId, cwd) {
    return {
        version: exports.CHAT_FORMAT_VERSION,
        kind,
        sessionId,
        savedAt: new Date().toISOString(),
        project: projectName(cwd),
        cwd: (0, node_path_1.resolve)(cwd),
        messages: history,
    };
}
function parsePayload(raw) {
    try {
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
            return null;
        }
        if (data.messages[0]?.role !== "system")
            return null;
        return data;
    }
    catch {
        return null;
    }
}
function readPayloadFile(path) {
    if (!(0, node_fs_1.existsSync)(path))
        return null;
    return parsePayload((0, node_fs_1.readFileSync)(path, "utf-8"));
}
/** 手动存档到 chats/ */
function saveChatArchive(history, name, cwd = process.cwd()) {
    const userTurns = history.filter((m) => m.role === "user").length;
    if (userTurns === 0) {
        return { ok: false, error: "当前没有可保存的对话（尚无用户消息）" };
    }
    const chatName = sanitizeChatName(name?.trim() || defaultArchiveName());
    if (!chatName) {
        return {
            ok: false,
            error: `name 须为非空标识（≤${exports.CHAT_NAME_MAX_CHARS} 字符，字母数字 _ . -）`,
        };
    }
    const path = archiveFilePath(chatName, cwd);
    (0, node_fs_1.mkdirSync)(chatsDir(cwd), { recursive: true });
    writePayload(path, buildPayload(history, "archive", undefined, cwd));
    return { ok: true, name: chatName, path, messages: history.length };
}
/** 自动保存到 sessions/{sessionId}.json 与 sessions/current.json */
function autosaveSession(history, sessionId, cwd = process.cwd()) {
    const userTurns = history.filter((m) => m.role === "user").length;
    if (userTurns === 0) {
        return { ok: false, error: "skip" };
    }
    const dir = sessionsDir(cwd);
    (0, node_fs_1.mkdirSync)(dir, { recursive: true });
    const payload = buildPayload(history, "session", sessionId, cwd);
    const sessionPath = sessionFilePath(sessionId, cwd);
    const currentPath = currentSessionPath(cwd);
    writePayload(sessionPath, payload);
    writePayload(currentPath, payload);
    return { ok: true, name: sessionId, path: currentPath, messages: history.length };
}
/** 启动时恢复 sessions/current.json */
function restoreCurrentSession(cwd = process.cwd()) {
    return loadChatFromPath(currentSessionPath(cwd), "current");
}
/** /load [name]：无 name 读 current；有 name 读 chats/name */
function loadChatByName(name, cwd = process.cwd()) {
    if (!name?.trim()) {
        return restoreCurrentSession(cwd);
    }
    const safe = sanitizeChatName(name);
    if (!safe) {
        return { ok: false, error: `无效的 name：${name}` };
    }
    const chatPath = archiveFilePath(safe, cwd);
    if ((0, node_fs_1.existsSync)(chatPath)) {
        return loadChatFromPath(chatPath, safe);
    }
    const sessionPath = sessionFilePath(safe, cwd);
    if ((0, node_fs_1.existsSync)(sessionPath)) {
        return loadChatFromPath(sessionPath, safe);
    }
    return { ok: false, error: `未找到存档：${safe}（chats/ 或 sessions/）` };
}
function loadChatFromPath(path, label) {
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
function sessionIdFromCurrent(cwd = process.cwd()) {
    const payload = readPayloadFile(currentSessionPath(cwd));
    return payload?.sessionId ?? null;
}
function listChatArchives(cwd = process.cwd()) {
    const dir = chatsDir(cwd);
    if (!(0, node_fs_1.existsSync)(dir))
        return [];
    return (0, node_fs_1.readdirSync)(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -5))
        .sort();
}
function listSessionFiles(cwd = process.cwd()) {
    const dir = sessionsDir(cwd);
    if (!(0, node_fs_1.existsSync)(dir))
        return [];
    return (0, node_fs_1.readdirSync)(dir)
        .filter((f) => f.endsWith(".json") && f !== "current.json")
        .map((f) => f.slice(0, -5))
        .sort();
}
function formatSaveList(cwd = process.cwd()) {
    const archives = listChatArchives(cwd);
    const sessions = listSessionFiles(cwd);
    const lines = [`存档目录：${chatsDir(cwd)}`, `会话目录：${sessionsDir(cwd)}`, ""];
    if (archives.length) {
        lines.push(`手动存档 chats/（${archives.length}）`);
        archives.forEach((n) => lines.push(`· ${n}`));
    }
    else {
        lines.push("（chats/ 暂无手动存档）");
    }
    lines.push("");
    if (sessions.length) {
        lines.push(`自动会话 sessions/（${sessions.length}）`);
        sessions.forEach((n) => lines.push(`· ${n}`));
    }
    else {
        lines.push("（sessions/ 暂无历史会话文件）");
    }
    lines.push("", "· current → sessions/current.json（自动保存的最新进度）");
    return lines.join("\n");
}
/** @deprecated use saveChatArchive */
exports.saveChatHistory = saveChatArchive;
/** @deprecated use listChatArchives */
exports.listChatSaves = listChatArchives;
//# sourceMappingURL=chatSave.js.map