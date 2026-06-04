// 约定：export DEEPSEEK_API_KEY 与 TAVILY_API_KEY；/quit 或 exit 结束
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { complete } from "./ask.mjs";
import { runTool } from "./tools.mjs";

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  第 9 课 · Agent + Tavily 联网搜索

  在第 8 课基础上增加 web_search（真实联网）
  export TAVILY_API_KEY=...  申请：https://app.tavily.com
  文档：https://docs.tavily.com/welcome

  试：搜一下马斯克最近在干啥
  退出：/quit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const messages = [
  {
    role: "system",
    content:
      "你是中文助手。查新闻、大事用 web_search，不要为此调 get_time。问「现在几点」才用 get_time。根据工具结果用你自己的话简要总结，不要大段复述原文。",
  },
];
const rl = createInterface({ input: stdin, output: stdout });

while (true) {
  const user = await rl.question("你: ");
  if (user === "/quit" || user === "exit") break;

  messages.push({ role: "user", content: user });

  let message = await complete(messages);

  while (message.tool_calls?.length) {
    messages.push({
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls,
    });
    for (const call of message.tool_calls) {
      const result = await runTool(call);
      const preview = result.length > 80 ? result.slice(0, 80) + "…" : result;
      console.log(`[工具] ${call.function.name}(${call.function.arguments}) → ${preview}`);
      const clip = result.length > 1200 ? result.slice(0, 1200) + "…" : result;
      messages.push({ role: "tool", tool_call_id: call.id, content: clip });
    }
    message = await complete(messages);
  }

  messages.push({ role: "assistant", content: message.content });
  console.log("AI:", message.content);
}

rl.close();
