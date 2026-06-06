import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "./color.js";
import { AgentLoop } from "./loop.js";
import type { ToolCall } from "./messages.js";
import { handleTerminalEvent } from "./terminal.js";

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

console.log("Agent 工具钩子 — 审批 + 结果截断，/quit 结束");
console.log(
  color.meta(
    "试：读 package-lock.json 或 node_modules 里大文件，看截断说明是否进 history\n",
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
