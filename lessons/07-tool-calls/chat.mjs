// 约定：已 export DEEPSEEK_API_KEY
import { complete } from "./ask.mjs";
import { runTool } from "./tools.mjs";

const user = "杭州天气怎么样？";
console.log("你:", user);

const messages = [
  { role: "system", content: "你是助手。查天气时调用 get_weather，拿到结果后再用自然语言回答。" },
  { role: "user", content: user },
];

let message = await complete(messages);

while (message.tool_calls?.length) {
  messages.push({
    role: "assistant",
    content: message.content,
    tool_calls: message.tool_calls,
  });
  for (const call of message.tool_calls) {
    const result = runTool(call);
    console.log(`[工具] ${call.function.name}(${call.function.arguments}) → ${result}`);
    messages.push({ role: "tool", tool_call_id: call.id, content: result });
  }
  message = await complete(messages);
}

console.log("AI:", message.content);
