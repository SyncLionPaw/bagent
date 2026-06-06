import type { AgentEvent } from "./events.js";
import type { Messages, ToolCall } from "./messages.js";
import { streamEvents } from "./stream.js";
import { runTool } from "./tools.js";

const SYSTEM =
  "你是终端里的代码助手。可用工具：pwd（当前目录）、ls（列目录）、read_file（读文件）。所有 path 参数必须是绝对路径；不确定时先 pwd 或 ls。拿到工具结果后用自然语言回答，简洁。";

const DENIED = JSON.stringify({ error: "用户拒绝执行此工具" });

export type ApproveTool = (call: ToolCall) => Promise<boolean>;

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

        const ok = await approve(call);
        if (!ok) {
          yield { type: "ToolCallDenied", name };
          yield { type: "ToolResult", name, output: DENIED };
          this.history.push({
            role: "tool",
            tool_call_id: call.id,
            content: DENIED,
          });
          continue;
        }

        const output = runTool(call);
        yield { type: "ToolResult", name, output };
        this.history.push({
          role: "tool",
          tool_call_id: call.id,
          content: output,
        });
      }
    }
  }
}
