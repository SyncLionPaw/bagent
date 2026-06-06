import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "./color.js";
import { AgentLoop } from "./loop.js";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("请先 export DEEPSEEK_API_KEY");
  process.exit(1);
}

const agent = new AgentLoop();
const rl = createInterface({ input: stdin, output: stdout });

console.log("Agent Loop（流式）— /quit 结束");
console.log("试试：package.json 里的 name 是什么？\n");

while (true) {
  const user = await rl.question(`${color.user("你:")} `);
  if (user === "/quit" || user === "exit") break;
  if (!user.trim()) continue;

  await agent.turn(user);
  console.log(color.meta(`（history: ${agent.history.length} 条）\n`));
}

rl.close();
