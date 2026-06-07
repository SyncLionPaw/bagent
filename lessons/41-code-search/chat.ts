import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "../36-tool-hooks/color.js";
import { AgentLoop } from "../36-tool-hooks/loop.js";
import type { ToolCall } from "../36-tool-hooks/messages.js";
import { handleTerminalEvent } from "../36-tool-hooks/terminal.js";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("请先 export DEEPSEEK_API_KEY");
  process.exit(1);
}

const agent = new AgentLoop();
const rl = createInterface({ input: stdin, output: stdout });
const uiState = { aiOpen: false, thinkingOpen: false };

async function approve(call: ToolCall): Promise<boolean> {
  const line = await rl.question(
    color.warn(`允许 ${call.function.name}(${call.function.arguments})? [y/N] `),
  );
  const s = line.trim().toLowerCase();
  return s === "y" || s === "yes";
}

console.log("代码搜索 — ch36 内核 + grep，/quit 结束");
console.log(
  color.meta(
    "试：在 agent 目录搜 runTool（glob *.ts），或搜 package.json 里的 name\n",
  ),
);

while (true) {
  const user = await rl.question(`${color.user("你:")} `);
  if (user === "/quit" || user === "exit") break;
  if (!user.trim()) continue;

  try {
    for await (const event of agent.turn(user, approve)) {
      handleTerminalEvent(event, uiState);
    }
  } catch (err) {
    const last = agent.history.at(-1);
    if (last?.role === "user" && last.content === user) {
      agent.history.pop();
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(color.error(`\n[错误] ${msg}`));
    console.error(color.meta("网络超时或 API 不可达时可重试；/quit 退出\n"));
    continue;
  }

  console.log(color.meta(`（history: ${agent.history.length} 条）\n`));
}

rl.close();
