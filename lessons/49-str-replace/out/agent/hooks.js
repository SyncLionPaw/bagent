"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolAborted = exports.TOOL_DENIED = void 0;
exports.approvalBefore = approvalBefore;
exports.hooksWithApproval = hooksWithApproval;
exports.truncateMiddle = truncateMiddle;
exports.truncateAfter = truncateAfter;
exports.runWithHooks = runWithHooks;
const autoApprove_js_1 = require("./autoApprove.js");
exports.TOOL_DENIED = JSON.stringify({ error: "用户拒绝执行此工具" });
/** before 钩子可抛出此错误，短路整条工具管线（不执行 runTool） */
class ToolAborted extends Error {
    output;
    constructor(output) {
        super("tool aborted");
        this.name = "ToolAborted";
        this.output = output;
    }
}
exports.ToolAborted = ToolAborted;
/** 第 35 课的 approve，收编为 before 链上的第一个钩子 */
function approvalBefore(approve, denied = exports.TOOL_DENIED) {
    return async (ctx) => {
        if ((0, autoApprove_js_1.isAutoApproved)(ctx.call))
            return;
        if (!(await approve(ctx.call))) {
            throw new ToolAborted(denied);
        }
    };
}
function hooksWithApproval(hooks, approve) {
    return {
        ...hooks,
        before: [approvalBefore(approve), ...hooks.before],
    };
}
function truncateMiddle(output, maxChars) {
    if (output.length <= maxChars)
        return output;
    const note = (original) => `\n\n[已截断：原文 ${original} 字符，仅保留首尾，中间已省略]\n\n`;
    let marker = note(output.length);
    if (maxChars <= marker.length) {
        return output.slice(0, maxChars);
    }
    const budget = maxChars - marker.length;
    const head = Math.ceil(budget / 2);
    const tail = Math.floor(budget / 2);
    return output.slice(0, head) + marker + output.slice(output.length - tail);
}
function truncateAfter(maxChars) {
    return ({ output }) => truncateMiddle(output, maxChars);
}
async function runWithHooks(call, hooks, execute) {
    const ctx = { call, name: call.function.name };
    try {
        for (const hook of hooks.before) {
            await hook(ctx);
        }
        const raw = await execute(call);
        let output = raw;
        for (const hook of hooks.after) {
            output = await hook({ ...ctx, output });
        }
        return {
            status: "ok",
            output,
            truncated: output.length !== raw.length || output !== raw,
            originalLength: raw.length,
        };
    }
    catch (err) {
        if (err instanceof ToolAborted) {
            return { status: "aborted", output: err.output };
        }
        throw err;
    }
}
//# sourceMappingURL=hooks.js.map