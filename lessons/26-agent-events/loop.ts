import type { AgentEvent } from "./events.js";
import type { Messages } from "./messages.js";
import { streamEvents } from "./stream.js";
import { runTool } from "./tools.js";

const SYSTEM =
  "你是终端里的代码助手。需要看项目文件时调用 read_file。拿到工具结果后用自然语言回答，简洁。";

/**
 * Agent Loop：不直接写终端，只 async generator 产出 AgentEvent。
 * 消费方用 for await (const e of agent.turn(input)) { ... }
 */
export class AgentLoop {
  readonly history: Messages;

  constructor(system = SYSTEM) {
    this.history = [{ role: "system", content: system }];
  }

  async *turn(userInput: string): AsyncGenerator<AgentEvent> {
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
        yield {
          type: "ToolCallStart",
          name: call.function.name,
          arguments: call.function.arguments,
        };
        const output = runTool(call);
        yield { type: "ToolResult", name: call.function.name, output };
        this.history.push({
          role: "tool",
          tool_call_id: call.id,
          content: output,
        });
      }
    }
  }
}
