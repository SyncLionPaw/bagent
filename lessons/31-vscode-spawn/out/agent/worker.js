"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_readline_1 = require("node:readline");
const loop_1 = require("./loop");
function emit(event) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
}
if (!process.env.DEEPSEEK_API_KEY) {
    console.error("缺少 DEEPSEEK_API_KEY（插件应从 ~/.bagent/deepseek-api-key 注入）");
    process.exit(1);
}
const agent = new loop_1.AgentLoop();
let busy = false;
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
    if (req.op !== "chat" || !req.message.trim())
        return;
    if (busy) {
        emit({ type: "TurnEnd", text: "错误: 上一轮尚未结束" });
        return;
    }
    busy = true;
    try {
        for await (const event of agent.turn(req.message.trim())) {
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
    }
});
//# sourceMappingURL=worker.js.map