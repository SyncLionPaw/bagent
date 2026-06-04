import { complete } from "./ask.mjs";
import { runTool } from "./tools.mjs";

export const systemMessage = {
  role: "system",
  content:
    "你是中文助手。查新闻、大事用 web_search，不要为此调 get_time。问「现在几点」才用 get_time。根据工具结果用你自己的话简要总结，不要大段复述原文。",
};

export async function runTurn(messages) {
  const tools = [];
  let message = await complete(messages);

  while (message.tool_calls?.length) {
    messages.push({
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls,
    });
    for (const call of message.tool_calls) {
      const result = await runTool(call);
      const preview =
        result.length > 80 ? result.slice(0, 80) + "…" : result;
      tools.push({
        name: call.function.name,
        arguments: call.function.arguments,
        preview,
      });
      const clip =
        result.length > 1200 ? result.slice(0, 1200) + "…" : result;
      messages.push({ role: "tool", tool_call_id: call.id, content: clip });
    }
    message = await complete(messages);
  }

  messages.push({ role: "assistant", content: message.content });
  return { content: message.content, tools, messages };
}
