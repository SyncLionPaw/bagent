import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "./color.js";
import { AgentLoop } from "./loop.js";
import { handleTerminalEvent } from "./terminal.js";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("请先 export DEEPSEEK_API_KEY");
  process.exit(1);
}

const agent = new AgentLoop();
const rl = createInterface({ input: stdin, output: stdout });
const uiState = { aiOpen: false, thinkingOpen: false };

console.log("Agent 思考事件 — thinking 开启，/quit 结束");
console.log(color.meta("试：apple 里有几个 o？ 或 读一下 package.json\n"));

while (true) {
  const user = await rl.question(`${color.user("你:")} `);
  if (user === "/quit" || user === "exit") break;
  if (!user.trim()) continue;

  for await (const event of agent.turn(user)) {
    handleTerminalEvent(event, uiState);
  }

  console.log(color.meta(`（history: ${agent.history.length} 条）\n`));
}

rl.close();
