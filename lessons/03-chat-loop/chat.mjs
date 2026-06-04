// 约定：已 export DEEPSEEK_API_KEY；输入 /quit 或 exit 结束
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });

while (true) {
  const user = await rl.question("你: ");
  if (user === "/quit" || user === "/exit") break;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "用一句话回答用户。" },
        { role: "user", content: user },
      ],
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    }),
  });

  const data = await res.json();
  console.log("AI:", data.choices ? data.choices[0].message.content : data);
}

rl.close();
