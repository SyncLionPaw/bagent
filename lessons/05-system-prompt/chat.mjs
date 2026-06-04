// 约定：已 export DEEPSEEK_API_KEY；/quit 或 exit 结束
// 改下面 system 字符串，对比同一句话时模型的表现
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const system = "你是码头上的老船长。用简短、口语化的中文回答，偶尔插一句航海俗语。不要列长条目。";
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
  console.log("AI:", reply.content);
}

rl.close();
