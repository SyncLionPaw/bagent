"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASK_USER_SKIPPED_HINT = exports.ASK_USER_MAX_CHARS = void 0;
exports.parseAskUserQuestion = parseAskUserQuestion;
exports.formatAskUserToolOutput = formatAskUserToolOutput;
exports.ASK_USER_MAX_CHARS = 4_000;
exports.ASK_USER_SKIPPED_HINT = "用户不想填写此次信息补充，请你自行决定";
function parseAskUserQuestion(args) {
    try {
        const { question } = JSON.parse(args);
        const q = question?.trim();
        return q || null;
    }
    catch {
        return null;
    }
}
function formatAskUserToolOutput(result) {
    if (result.answered) {
        return JSON.stringify({ ok: true, answer: result.answer });
    }
    return JSON.stringify({ ok: false, hint: exports.ASK_USER_SKIPPED_HINT });
}
//# sourceMappingURL=askUser.js.map