import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "../36-tool-hooks/color.js";
import { handleTerminalEvent } from "../36-tool-hooks/terminal.js";
import type { AskUserResult } from "./agent/askUser.js";
import {
  autosaveSession,
  formatSaveList,
  loadChatByName,
  newSessionId,
  readPayloadFile,
  restoreCurrentSession,
  saveChatArchive,
  sessionIdFromCurrent,
} from "./agent/chatSave.js";
import { AgentLoop } from "./agent/loop.js";
import type { ToolCall } from "./agent/messages.js";
import { getToolDefinitions } from "./agent/tools.js";
import { hasWebSearch } from "./agent/tavily.js";
import { parseSlashCommand, slashHelpText } from "./src/utils/slash.js";
import { printPlanUpdated } from "./terminal-plan.js";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("请先 export DEEPSEEK_API_KEY");
  process.exit(1);
}

const agent = new AgentLoop();
let sessionId = newSessionId();
const restored = restoreCurrentSession();
if (restored.ok) {
  agent.replaceHistory(restored.messages);
  const payload = readPayloadFile(restored.path);
  sessionId = payload?.sessionId ?? sessionIdFromCurrent() ?? sessionId;
  console.log(
    color.meta(`已恢复会话（${restored.count} 条）→ ${restored.path}`),
  );
}

const rl = createInterface({ input: stdin, output: stdout });
const uiState = { aiOpen: false, thinkingOpen: false };

const AUTOSAVE_MS = 120_000;
setInterval(() => {
  autosaveSession(agent.history, sessionId);
}, AUTOSAVE_MS);

function persistSession(): void {
  const r = autosaveSession(agent.history, sessionId);
  if (r.ok) sessionId = r.name;
}

async function approve(call: ToolCall): Promise<boolean> {
  const warn =
    call.function.name === "write_file"
      ? color.error("⚠ 危险：将覆盖写入文件！")
      : call.function.name === "str_replace"
        ? color.error("⚠ 危险：将修改文件内容！")
        : call.function.name === "delete_file"
          ? color.error("⚠ 危险：将永久删除文件！")
          : call.function.name === "run_command"
            ? color.error("⚠ 危险：将执行终端命令！")
            : "";
  if (warn) console.log(warn);
  const line = await rl.question(
    color.warn(`允许 ${call.function.name}(${call.function.arguments})? [Y/n] `),
  );
  const s = line.trim().toLowerCase();
  return s === "" || s === "y" || s === "yes";
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
    `第 52 课 — 编辑提案（不落盘）· 工具：${toolNames}\n` +
      (hasWebSearch()
        ? "Tavily 已配置，含 web_search\n"
        : "未配置 TAVILY_API_KEY，无 web_search\n"),
  ),
);
console.log(
  color.meta("/save [name] · /load [name] · /saves · /help · /quit 退出\n"),
);

while (true) {
  const user = await rl.question(`${color.user("你:")} `);
  if (user === "/quit" || user === "exit") break;
  if (!user.trim()) continue;

  const slash = parseSlashCommand(user);
  if (slash.type === "help") {
    console.log(color.meta(slashHelpText()));
    continue;
  }
  if (slash.type === "save_chat") {
    const result = saveChatArchive(agent.history, slash.name);
    if (result.ok) {
      console.log(
        color.meta(
          `已存档「${result.name}」→ ${result.path}（${result.messages} 条消息）`,
        ),
      );
    } else {
      console.error(color.error(result.error));
    }
    continue;
  }
  if (slash.type === "load_chat") {
    const result = loadChatByName(slash.name);
    if (result.ok) {
      agent.replaceHistory(result.messages);
      const payload = readPayloadFile(result.path);
      sessionId =
        payload?.sessionId ??
        (result.name === "current" ? sessionIdFromCurrent() : null) ??
        newSessionId();
      persistSession();
      console.log(
        color.meta(
          `已加载「${result.name}」→ ${result.path}（${result.count} 条消息）`,
        ),
      );
    } else {
      console.error(color.error(result.error));
    }
    continue;
  }
  if (slash.type === "list_chats") {
    console.log(color.meta(formatSaveList()));
    continue;
  }

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
        process.stdout.write(color.warn("  等待你批准…（直接回车 = 允许）\n"));
        continue;
      }
      handleTerminalEvent(event, uiState);
    }
    persistSession();
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

persistSession();
rl.close();
