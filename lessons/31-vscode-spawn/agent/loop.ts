import type { AgentEvent } from "./events";
import type { Messages } from "./messages";
import { streamEvents } from "./stream";
import { runTool } from "./tools";

const SYSTEM =
  "你是 IDE 侧边栏里的中文助手。看项目文件用 read_file；查新闻、最近动态用 web_search（不要为此调 get_time）；问几点、几号用 get_time；算数用 calculate。根据工具结果用自己的话简要回答。";

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
        const output = await runTool(call);
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
