import { BEHAVIOR_RULES } from "./system.js";

/** 随每条发往 API 的用户消息附带的隐性规则（history 里不存） */

const REMINDER_RE = /<reminder>[\s\S]*?<\/reminder>/gi;

/** 在发往 LLM 的用户消息后追加隐性提醒 */
export function augmentUserMessage(text: string, _turnIndex?: number): string {
  const clean = stripReminder(text);
  return `${clean}\n<reminder>\n${BEHAVIOR_RULES}\n</reminder>`;
}

/** UI 安全网：去掉消息里的 reminder 块 */
export function stripReminder(text: string): string {
  return text.replace(REMINDER_RE, "").trimEnd();
}
