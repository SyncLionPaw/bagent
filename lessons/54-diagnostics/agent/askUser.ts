import type { ToolCall } from "./messages.js";

export const ASK_USER_MAX_CHARS = 4_000;
export const ASK_USER_SKIPPED_HINT = "用户不想填写此次信息补充，请你自行决定";

export type AskUserResult =
  | { answered: true; answer: string }
  | { answered: false };

export type AskUserTool = (
  call: ToolCall,
  question: string,
) => Promise<AskUserResult>;

export function parseAskUserQuestion(args: string): string | null {
  try {
    const { question } = JSON.parse(args) as { question?: string };
    const q = question?.trim();
    return q || null;
  } catch {
    return null;
  }
}

export function formatAskUserToolOutput(result: AskUserResult): string {
  if (result.answered) {
    return JSON.stringify({ ok: true, answer: result.answer });
  }
  return JSON.stringify({ ok: false, hint: ASK_USER_SKIPPED_HINT });
}
