import { isAutoApproved } from "./autoApprove.js";
import {
  ASK_USER_MAX_CHARS,
  formatAskUserToolOutput,
  parseAskUserQuestion,
  type AskUserTool,
} from "./askUser.js";
import { runDiagnosticAfterEdit } from "./diagnostics.js";
import type { AgentEvent } from "./events.js";
import {
  formatAppliedEdit,
  isEditTool,
  parseEditProposal,
} from "./editProposal.js";
import {
  hooksWithApproval,
  runWithHooks,
  TOOL_DENIED,
  truncateMiddle,
  type ApproveTool,
  type EditApplyTool,
} from "./hooks.js";
import type { Messages } from "./messages.js";
import { streamEvents } from "./stream.js";
import { snapshotFromToolOutput } from "./plan.js";
import { getPluginSystem } from "./system.js";
import { hooksFor, runTool } from "./tools.js";

const SYSTEM = getPluginSystem();

export type { ApproveTool, AskUserTool, EditApplyTool };

export class AgentLoop {
  readonly history: Messages;

  constructor(system = SYSTEM) {
    this.history = [{ role: "system", content: system }];
  }

  /** 反序列化恢复对话（替换内存 history） */
  replaceHistory(messages: Messages): void {
    this.history.length = 0;
    this.history.push(...messages);
  }

  async *turn(
    userInput: string,
    approve: ApproveTool,
    askUser: AskUserTool,
    editApply: EditApplyTool,
  ): AsyncGenerator<AgentEvent> {
    yield { type: "TurnStart", userInput };
    this.history.push({ role: "user", content: userInput });

    while (true) {
      const stream = streamEvents(this.history);
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
          const question = parseAskUserQuestion(args);
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
          const raw = formatAskUserToolOutput(userResult);
          const output = truncateMiddle(raw, ASK_USER_MAX_CHARS);
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

        if (isEditTool(name)) {
          const hooks = hooksFor(call);
          const result = await runWithHooks(
            call,
            { maxOutputChars: hooks.maxOutputChars, before: hooks.before, after: [] },
            runTool,
          );

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

          const proposal = parseEditProposal(result.output);
          if (!proposal) {
            const err = JSON.stringify({
              error: "编辑提案解析失败，未打开 diff（请重试或检查文件大小）",
            });
            yield { type: "ToolResult", name, output: err };
            this.history.push({
              role: "tool",
              tool_call_id: call.id,
              content: err,
            });
            continue;
          }

          yield {
            type: "EditProposal",
            tool: name,
            path: proposal.path,
            oldContent: proposal.oldContent,
            newContent: proposal.newContent,
            arguments: args,
          };

          const allowed = await editApply();
          if (!allowed) {
            yield { type: "ToolCallDenied", name };
            yield { type: "ToolResult", name, output: TOOL_DENIED };
            this.history.push({
              role: "tool",
              tool_call_id: call.id,
              content: TOOL_DENIED,
            });
            continue;
          }

          const diagNote = runDiagnosticAfterEdit(proposal.path);
          const applied = formatAppliedEdit(proposal.path, proposal.newContent, diagNote || undefined);
          yield {
            type: "ToolResult",
            name,
            output: applied,
            truncated: false,
            originalLength: applied.length,
          };
          this.history.push({
            role: "tool",
            tool_call_id: call.id,
            content: applied,
          });
          continue;
        }

        if (isAutoApproved(call)) {
          yield { type: "ToolCallAutoApproved", name, arguments: args };
        } else {
          yield { type: "ToolCallPending", name, arguments: args };
        }

        const result = await runWithHooks(
          call,
          hooksWithApproval(hooksFor(call), approve),
          runTool,
        );

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

        if (name === "plan_operate") {
          const snap = snapshotFromToolOutput(result.output);
          if (snap) yield { type: "PlanUpdated", ...snap };
        }

        this.history.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.output,
        });
      }
    }
  }
}
