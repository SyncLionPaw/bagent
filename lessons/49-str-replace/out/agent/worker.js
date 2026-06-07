"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_readline_1 = require("node:readline");
const chatSave_js_1 = require("./chatSave.js");
const loop_1 = require("./loop");
let currentModel = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
process.env.DEEPSEEK_MODEL = currentModel;
function emit(event) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
}
if (!process.env.DEEPSEEK_API_KEY) {
    console.error("缺少 DEEPSEEK_API_KEY（插件应从 ~/.bagent/deepseek-api-key 注入）");
    process.exit(1);
}
const agent = new loop_1.AgentLoop();
let busy = false;
let approvalResolve = null;
let askUserResolve = null;
let sessionId = (0, chatSave_js_1.newSessionId)();
const restored = (0, chatSave_js_1.restoreCurrentSession)();
if (restored.ok) {
    agent.replaceHistory(restored.messages);
    const payload = (0, chatSave_js_1.readPayloadFile)(restored.path);
    sessionId = payload?.sessionId ?? (0, chatSave_js_1.sessionIdFromCurrent)() ?? sessionId;
}
emit({
    type: "SessionReady",
    sessionId,
    restored: restored.ok,
    messages: agent.history.length,
    path: restored.ok ? restored.path : undefined,
});
const AUTOSAVE_MS = 120_000;
let autosaveTimer = setInterval(() => {
    if (busy)
        return;
    (0, chatSave_js_1.autosaveSession)(agent.history, sessionId);
}, AUTOSAVE_MS);
function persistSession() {
    const result = (0, chatSave_js_1.autosaveSession)(agent.history, sessionId);
    if (result.ok)
        sessionId = result.name;
}
async function approve(_call) {
    return new Promise((resolve) => {
        approvalResolve = resolve;
    });
}
async function askUser(_call, _question) {
    return new Promise((resolve) => {
        askUserResolve = resolve;
    });
}
const rl = (0, node_readline_1.createInterface)({ input: process.stdin });
rl.on("line", async (line) => {
    let req;
    try {
        req = JSON.parse(line);
    }
    catch {
        return;
    }
    if (req.op === "shutdown") {
        persistSession();
        if (autosaveTimer)
            clearInterval(autosaveTimer);
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
        }
        else {
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
        const result = (0, chatSave_js_1.saveChatArchive)(agent.history, req.name);
        if (result.ok) {
            emit({
                type: "WorkerResult",
                op: "save_chat",
                ok: true,
                name: result.name,
                path: result.path,
                messages: result.messages,
            });
        }
        else {
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
        const result = (0, chatSave_js_1.loadChatByName)(req.name);
        if (result.ok) {
            agent.replaceHistory(result.messages);
            const payload = (0, chatSave_js_1.readPayloadFile)(result.path);
            sessionId =
                payload?.sessionId ??
                    (result.name === "current" ? (0, chatSave_js_1.sessionIdFromCurrent)() : null) ??
                    (0, chatSave_js_1.newSessionId)();
            persistSession();
            emit({
                type: "WorkerResult",
                op: "load_chat",
                ok: true,
                name: result.name,
                path: result.path,
                messages: result.count,
            });
        }
        else {
            emit({ type: "WorkerResult", op: "load_chat", ok: false, error: result.error });
        }
        return;
    }
    if (req.op === "list_chats") {
        emit({
            type: "WorkerResult",
            op: "list_chats",
            text: (0, chatSave_js_1.formatSaveList)(),
        });
        return;
    }
    if (req.op !== "chat" || !req.message.trim())
        return;
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
    }
    catch (err) {
        emit({
            type: "TurnEnd",
            text: `错误: ${err instanceof Error ? err.message : String(err)}`,
        });
    }
    finally {
        busy = false;
        approvalResolve = null;
        askUserResolve = null;
    }
});
//# sourceMappingURL=worker.js.map