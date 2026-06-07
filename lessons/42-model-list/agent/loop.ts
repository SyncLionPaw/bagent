import type { AgentEvent } from "./events.js";
import { hooksWithApproval, runWithHooks, type ApproveTool } from "./hooks.js";
import type { Messages } from "./messages.js";
import { streamEvents } from "./stream.js";
import { PLUGIN_SYSTEM } from "./system.js";
import { hooksFor, runTool } from "./tools.js";

const SYSTEM = PLUGIN_SYSTEM;

export type { ApproveTool };

export class AgentLoop {
  readonly history: Messages;

  constructor(system = SYSTEM) {
    this.history = [{ role: "system", content: system }];
  }

  async *turn(
    userInput: string,
    approve: ApproveTool,
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
        yield { type: "ToolCallPending", name, arguments: args };

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
        this.history.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.output,
        });
      }
    }
  }
}
