"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_readline_1 = require("node:readline");
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