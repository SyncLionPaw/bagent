"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLoop = void 0;
const hooks_js_1 = require("./hooks.js");
const stream_js_1 = require("./stream.js");
const system_js_1 = require("./system.js");
const tools_js_1 = require("./tools.js");
const SYSTEM = system_js_1.PLUGIN_SYSTEM;
class AgentLoop {
    history;
    constructor(system = SYSTEM) {
        this.history = [{ role: "system", content: system }];
    }
    async *turn(userInput, approve) {
        yield { type: "TurnStart", userInput };
        this.history.push({ role: "user", content: userInput });
        while (true) {
            const stream = (0, stream_js_1.streamEvents)(this.history);
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
                const { name, arguments: args } = call.function;
                yield { type: "ToolCallStart", name, arguments: args };
                yield { type: "ToolCallPending", name, arguments: args };
                const result = await (0, hooks_js_1.runWithHooks)(call, (0, hooks_js_1.hooksWithApproval)((0, tools_js_1.hooksFor)(call), approve), tools_js_1.runTool);
                if (result.status === "aborted") {
                    yield { type: "ToolCallDenied", name };
                    yield { type: "ToolResult", name, output: result.output };
                    this.history.push({
                        role: "tool",
                        tool_call_id: call.id,
                        content: result.output,
                    });
                    continue;
                }
                yield {
                    type: "ToolResult",
                    name,
                    output: result.output,
                    truncated: result.truncated,
                    originalLength: result.originalLength,
                };
                this.history.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: result.output,
                });
            }
        }
    }
}
exports.AgentLoop = AgentLoop;
//# sourceMappingURL=loop.js.map