import type { ToolCall } from "./messages";

export const TOOL_DENIED = JSON.stringify({ error: "用户拒绝执行此工具" });

export type ApproveTool = (call: ToolCall) => Promise<boolean>;

export type ToolHookContext = {
  call: ToolCall;
  name: string;
};

export type ToolHookBefore = (ctx: ToolHookContext) => void | Promise<void>;

export type ToolHookAfter = (
  ctx: ToolHookContext & { output: string },
) => string | Promise<string>;

export type ToolHooks = {
  maxOutputChars: number;
  before: ToolHookBefore[];
  after: ToolHookAfter[];
};

export class ToolAborted extends Error {
  readonly output: string;

  constructor(output: string) {
    super("tool aborted");
    this.name = "ToolAborted";
    this.output = output;
  }
}

export function approvalBefore(
  approve: ApproveTool,
  denied = TOOL_DENIED,
): ToolHookBefore {
  return async (ctx) => {
    if (!(await approve(ctx.call))) {
      throw new ToolAborted(denied);
    }
  };
}

export function hooksWithApproval(hooks: ToolHooks, approve: ApproveTool): ToolHooks {
  return {
    ...hooks,
    before: [approvalBefore(approve), ...hooks.before],
  };
}

export function truncateMiddle(output: string, maxChars: number): string {
  if (output.length <= maxChars) return output;

  const note = (original: number) =>
    `\n\n[已截断：原文 ${original} 字符，仅保留首尾，中间已省略]\n\n`;

  let marker = note(output.length);
  if (maxChars <= marker.length) {
    return output.slice(0, maxChars);
  }

  const budget = maxChars - marker.length;
  const head = Math.ceil(budget / 2);
  const tail = Math.floor(budget / 2);
  return output.slice(0, head) + marker + output.slice(output.length - tail);
}

export function truncateAfter(maxChars: number): ToolHookAfter {
  return ({ output }) => truncateMiddle(output, maxChars);
}

export type ToolRunOk = {
  status: "ok";
  output: string;
  truncated: boolean;
  originalLength: number;
};

export type ToolRunAborted = {
  status: "aborted";
  output: string;
};

export type ToolRunResult = ToolRunOk | ToolRunAborted;

export async function runWithHooks(
  call: ToolCall,
  hooks: ToolHooks,
  execute: (call: ToolCall) => string,
): Promise<ToolRunResult> {
  const ctx: ToolHookContext = { call, name: call.function.name };

  try {
    for (const hook of hooks.before) {
      await hook(ctx);
    }

    const raw = execute(call);
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
  } catch (err) {
    if (err instanceof ToolAborted) {
      return { status: "aborted", output: err.output };
    }
    throw err;
  }
}
