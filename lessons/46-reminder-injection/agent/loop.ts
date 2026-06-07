import { isAutoApproved } from "./autoApprove.js";
import {
  ASK_USER_MAX_CHARS,
  formatAskUserToolOutput,
  parseAskUserQuestion,
  type AskUserTool,
} from "./askUser.js";
import type { AgentEvent } from "./events.js";
import {
  hooksWithApproval,
  runWithHooks,
  truncateMiddle,
  type ApproveTool,
} from "./hooks.js";
import type { Messages } from "./messages.js";
import { streamEvents } from "./stream.js";
import { snapshotFromToolOutput } from "./plan.js";
import { getPluginSystem } from "./system.js";
import { hooksFor, runTool } from "./tools.js";

const SYSTEM = getPluginSystem();

export type { ApproveTool, AskUserTool };

export class AgentLoop {
  readonly history: Messages;

  constructor(system = SYSTEM) {
    this.history = [{ role: "system", content: system }];
  }

  async *turn(
    userInput: string,
    approve: ApproveTool,
    askUser: AskUserTool,
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
