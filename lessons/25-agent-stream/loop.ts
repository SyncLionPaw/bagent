import type { Messages } from "./messages.js";
import { color } from "./color.js";
import { streamComplete } from "./stream.js";
import { runTool } from "./tools.js";

const SYSTEM =
  "你是终端里的代码助手。需要看项目文件时调用 read_file。拿到工具结果后用自然语言回答，简洁。";

/** 与第 24 课相同的 Agent Loop，但模型回复走 SSE 流式打印 */
export class AgentLoop {
  readonly history: Messages;

  constructor(system = SYSTEM) {
    this.history = [{ role: "system", content: system }];
  }

  async turn(userInput: string): Promise<string> {
    this.history.push({ role: "user", content: userInput });

    while (true) {
      process.stdout.write(color.ai("AI: "));
      const raw = await streamComplete(this.history, (piece) => {
        process.stdout.write(color.ai(piece));
      });
      process.stdout.write("\n");

      this.history.push(raw);

      if (!raw.tool_calls?.length) {
        return raw.content ?? "";
      }

      for (const call of raw.tool_calls) {
        const result = runTool(call);
        console.log(
          color.tool(`[工具] ${call.function.name}(${call.function.arguments})`),
        );
        const preview = result.length > 120 ? `${result.slice(0, 120)}…` : result;
        console.log(color.toolResult(`  → ${preview.replace(/\n/g, " ")}`));
        this.history.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }
  }
}
