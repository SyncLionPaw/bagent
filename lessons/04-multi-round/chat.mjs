// 约定：已 export DEEPSEEK_API_KEY；/quit 或 exit 结束
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const messages = [{ role: "system", content: "简洁回答用户。" }];
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
