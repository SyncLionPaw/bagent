"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLoop = void 0;
const autoApprove_js_1 = require("./autoApprove.js");
const askUser_js_1 = require("./askUser.js");
const hooks_js_1 = require("./hooks.js");
const stream_js_1 = require("./stream.js");
const system_js_1 = require("./system.js");
const tools_js_1 = require("./tools.js");
const SYSTEM = (0, system_js_1.getPluginSystem)();
class AgentLoop {
    history;
    constructor(system = SYSTEM) {
        this.history = [{ role: "system", content: system }];
    }
    async *turn(userInput, approve, askUser) {
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
                if (name === "ask_user_question") {
                    const question = (0, askUser_js_1.parseAskUserQuestion)(args);
                    if (!question) {
                        const output = JSON.stringify({ ok: false, error: "question 不能为空" });
                        yield { type: "ToolResult", name, output };
                        this.history.push({
                            role: "tool",
                            tool_call_id: call.id,
                            content: output,
                        });
                        continue;
                    }
                    yield { type: "AskUserPending", name, question };
                    const userResult = await askUser(call, question);
                    const raw = (0, askUser_js_1.formatAskUserToolOutput)(userResult);
                    const output = (0, hooks_js_1.truncateMiddle)(raw, askUser_js_1.ASK_USER_MAX_CHARS);
                    const truncated = output.length !== raw.length;
                    yield {
                        type: "ToolResult",
                        name,
                        output,
                        truncated,
                        originalLength: raw.length,
                    };
                    this.history.push({
                        role: "tool",
                        tool_call_id: call.id,
                        content: output,
                    });
                    continue;
                }
                if ((0, autoApprove_js_1.isAutoApproved)(call)) {
                    yield { type: "ToolCallAutoApproved", name, arguments: args };
                }
                else {
                    yield { type: "ToolCallPending", name, arguments: args };
                }
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