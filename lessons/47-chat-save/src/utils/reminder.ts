/** 与 agent/reminder.ts 的 stripReminder 保持一致，供 webview 展示用 */

const REMINDER_RE = /<reminder>[\s\S]*?<\/reminder>/gi;

export function stripReminder(text: string): string {
  return text.replace(REMINDER_RE, "").trimEnd();
}
