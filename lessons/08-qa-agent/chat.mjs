// 约定：已 export DEEPSEEK_API_KEY；/quit 或 exit 结束
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { complete } from "./ask.mjs";
import { runTool } from "./tools.mjs";

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎉 第 8 课 · 你的第一个问答 Agent

  两个工具：看时间、算数（无联网搜索）
  只需 DEEPSEEK_API_KEY

  随便玩几句，例如：
    · 现在几点？用一句话吐槽一下周一
    · 帮我算 (99+1)*37-42
    · 月薪 15000 扣 10% 税还剩多少？

  退出：/quit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const messages = [
  {
    role: "system",
    content:
      "你是活泼的中文助手。问几点用 get_time，算数用 calculate。需要工具时先调再回答，否则直接聊。简洁中文，偶尔 emoji。",
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
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
    message = await complete(messages);
  }

  messages.push({ role: "assistant", content: message.content });
  console.log("AI:", message.content);
}

rl.close();
console.log("\nAgent 已退出。你刚跑的就是迷你版 Cursor / ChatGPT 插件的核心循环。下节课见 👋\n");
