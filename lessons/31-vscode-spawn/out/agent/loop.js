"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLoop = void 0;
const stream_1 = require("./stream");
const tools_1 = require("./tools");
const SYSTEM = "你是 IDE 侧边栏里的中文助手。看项目文件用 read_file；查新闻、最近动态用 web_search（不要为此调 get_time）；问几点、几号用 get_time；算数用 calculate。根据工具结果用自己的话简要回答。";
class AgentLoop {
    history;
    constructor(system = SYSTEM) {
        this.history = [{ role: "system", content: system }];
    }
    async *turn(userInput) {
        yield { type: "TurnStart", userInput };
        this.history.push({ role: "user", content: userInput });
        while (true) {
            const stream = (0, stream_1.streamEvents)(this.history);
            let step = await stream.next();
            while (!step.done) {
                yield step.value;
                step = await stream.next();
            }
            const assistant = step.value;
            this.history.push(assistant);
            if (!assistant.tool_calls?.length) {
                yield { type: "TurnEnd", text: assistant.content ?? "" };
                return;
            }
            for (const call of assistant.tool_calls) {
                yield {
                    type: "ToolCallStart",
                    name: call.function.name,
                    arguments: call.function.arguments,
                };
                const output = await (0, tools_1.runTool)(call);
                yield { type: "ToolResult", name: call.function.name, output };
                this.history.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: output,
                });
            }
        }
    }
}
exports.AgentLoop = AgentLoop;
//# sourceMappingURL=loop.js.map