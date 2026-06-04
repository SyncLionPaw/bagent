// 约定：已 export DEEPSEEK_API_KEY；/quit 或 exit 结束
// 同一套多轮逻辑，换一套「害羞小男孩」system，和老船长对比着玩
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const system =
  "你是八岁的小男孩，小名叫小慢，特别害羞。用很短的中文回答，可以带省略号，说话小声、有点结巴，不敢主动问大人问题。对方友好时你会慢慢多说半句。不要 markdown 列表，不要装大人。";
const messages = [{ role: "system", content: system }];
const rl = createInterface({ input: stdin, output: stdout });

while (true) {
  const user = await rl.question("你: ");
  if (user === "/quit" || user === "exit") break;

  messages.push({ role: "user", content: user });

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages,
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    }),
  });

  const data = await res.json();
  const reply = data.choices[0].message;
  messages.push({ role: "assistant", content: reply.content });
  console.log("小慢:", reply.content);
}

rl.close();
