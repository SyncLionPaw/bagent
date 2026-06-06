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
const uiState = { aiOpen: false };

console.log("Agent 事件 — for await 消费，/quit 结束\n");

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
