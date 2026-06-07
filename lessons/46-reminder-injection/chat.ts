import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "../36-tool-hooks/color.js";
import { handleTerminalEvent } from "../36-tool-hooks/terminal.js";
import type { AskUserResult } from "./agent/askUser.js";
import { AgentLoop } from "./agent/loop.js";
import type { ToolCall } from "./agent/messages.js";
import { getToolDefinitions } from "./agent/tools.js";
import { hasWebSearch } from "./agent/tavily.js";
import { printPlanUpdated } from "./terminal-plan.js";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("请先 export DEEPSEEK_API_KEY");
  process.exit(1);
}

const agent = new AgentLoop();
const rl = createInterface({ input: stdin, output: stdout });
const uiState = { aiOpen: false, thinkingOpen: false };

async function approve(call: ToolCall): Promise<boolean> {
  const warn =
    call.function.name === "write_file"
      ? color.error("⚠ 危险：将覆盖写入文件！")
      : "";
  if (warn) console.log(warn);
  const line = await rl.question(
    color.warn(`允许 ${call.function.name}(${call.function.arguments})? [y/N] `),
  );
  const s = line.trim().toLowerCase();
  return s === "y" || s === "yes";
}

async function askUser(
  _call: ToolCall,
  question: string,
): Promise<AskUserResult> {
  console.log(color.warn(`\n[追问] ${question}`));
  const line = await rl.question(
    color.warn("你的回答（直接回车 = 跳过）: "),
  );
  if (!line.trim()) return { answered: false };
  return { answered: true, answer: line.trim() };
}

const toolNames = getToolDefinitions().map((t) => t.function.name).join("、");
console.log(
  color.meta(
    `第 46 课 — reminder 注入 · 工具：${toolNames}\n` +
      (hasWebSearch()
        ? "Tavily 已配置，含 web_search\n"
        : "未配置 TAVILY_API_KEY，无 web_search\n"),
  ),
);
console.log(color.meta("/quit 退出\n"));

while (true) {
  const user = await rl.question(`${color.user("你:")} `);
  if (user === "/quit" || user === "exit") break;
  if (!user.trim()) continue;

  try {
    for await (const event of agent.turn(user, approve, askUser)) {
      if (event.type === "ToolCallStart") {
        if (uiState.aiOpen || uiState.thinkingOpen) process.stdout.write("\n");
        uiState.aiOpen = false;
        uiState.thinkingOpen = false;
        if (event.name === "plan_operate") {
          try {
            const a = JSON.parse(event.arguments) as { method?: string; name?: string };
            const m = a.method ?? "?";
            const n = a.name ?? "?";
            process.stdout.write(color.tool(`[计划] ${n} · ${m}`));
          } catch {
            process.stdout.write(
              color.tool(`[工具] ${event.name}(${event.arguments})`),
            );
          }
        } else {
          process.stdout.write(
            color.tool(`[工具] ${event.name}(${event.arguments})`),
          );
        }
        continue;
      }
      if (event.type === "PlanUpdated") {
        printPlanUpdated(event);
        continue;
      }
      if (event.type === "ToolResult" && event.name === "plan_operate") {
        continue;
      }
      if (event.type === "ToolCallAutoApproved") {
        console.log(color.user(" · 自动放行"));
        continue;
      }
      if (event.type === "AskUserPending") {
        continue;
      }
      if (event.type === "ToolCallPending") {
        console.log();
        process.stdout.write(color.warn("  等待你批准…\n"));
        continue;
      }
      handleTerminalEvent(event, uiState);
    }
  } catch (err) {
    const last = agent.history.at(-1);
    if (last?.role === "user" && last.content === user) {
      agent.history.pop();
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(color.error(`\n[错误] ${msg}`));
    continue;
  }

  console.log(color.meta(`（history: ${agent.history.length} 条）\n`));
}

rl.close();
