import type { AssistantMessage, Messages } from "./messages.js";
import { color } from "./color.js";
import { complete } from "./complete.js";
import { runTool } from "./tools.js";

const SYSTEM =
  "你是终端里的代码助手。需要看项目文件时调用 read_file。拿到工具结果后用自然语言回答，简洁。";

/**
 * Agent Loop：维护 Messages，处理「用户一轮输入」。
 *
 * - 外层：chat.ts 的 while，用户可连续多轮对话
 * - 内层：turn() 里的 while，一轮里可能多次 模型→工具→模型
 */
export class AgentLoop {
  readonly history: Messages;

  constructor(system = SYSTEM) {
    this.history = [{ role: "system", content: system }];
  }

  async turn(userInput: string): Promise<string> {
    this.history.push({ role: "user", content: userInput });

    while (true) {
      const raw = await complete(this.history);

      const assistant: AssistantMessage = {
        role: "assistant",
        content: raw.content,
        ...(raw.tool_calls?.length ? { tool_calls: raw.tool_calls } : {}),
      };
      this.history.push(assistant);

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
