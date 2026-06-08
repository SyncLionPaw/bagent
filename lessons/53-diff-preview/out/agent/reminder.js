"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.augmentUserMessage = augmentUserMessage;
exports.stripReminder = stripReminder;
const system_js_1 = require("./system.js");
/** 随每条发往 API 的用户消息附带的隐性规则（history 里不存） */
const REMINDER_RE = /<reminder>[\s\S]*?<\/reminder>/gi;
/** 在发往 LLM 的用户消息后追加隐性提醒 */
function augmentUserMessage(text, _turnIndex) {
    const clean = stripReminder(text);
    return `${clean}\n<reminder>\n${system_js_1.BEHAVIOR_RULES}\n</reminder>`;
}
/** UI 安全网：去掉消息里的 reminder 块 */
function stripReminder(text) {
    return text.replace(REMINDER_RE, "").trimEnd();
}
//# sourceMappingURL=reminder.js.map