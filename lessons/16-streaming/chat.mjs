// 约定：已 export DEEPSEEK_API_KEY；/quit 或 exit 结束
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { streamChat } from "./ask.mjs";

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  第 16 课 · SSE 直连 DeepSeek（先完成第 14、15 课）

  对比第 6 课：解析 data: 行，边生成边打印
  退出：/quit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const messages = [{ role: "system", content: "简洁回答用户。" }];
const rl = createInterface({ input: stdin, output: stdout });

while (true) {
  const user = await rl.question("你: ");
  if (user === "/quit" || user === "exit") break;

  messages.push({ role: "user", content: user });
  const content = await streamChat(messages);
  messages.push({ role: "assistant", content });
}

rl.close();
