"use strict";
/** 与 agent/reminder.ts 的 stripReminder 保持一致，供 webview 展示用 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripReminder = stripReminder;
const REMINDER_RE = /<reminder>[\s\S]*?<\/reminder>/gi;
function stripReminder(text) {
    return text.replace(REMINDER_RE, "").trimEnd();
}
//# sourceMappingURL=reminder.js.map