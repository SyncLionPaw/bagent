import { unlinkSync, writeFileSync } from "node:fs";
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

let pendingEdit: {
  path: string;
  oldContent: string;
  newContent: string;
} | null = null;

async function editApply(): Promise<boolean> {
  if (!pendingEdit) return false;
  const p = pendingEdit;
  pendingEdit = null;
  console.log(
    color.warn(
      `\n[编辑提案] ${p.path}（${p.oldContent.length} → ${p.newContent.length} 字符）`,
    ),
  );
  const line = await rl.question(color.warn("写盘? [Y/n] "));
  const s = line.trim().toLowerCase();
  if (!(s === "" || s === "y" || s === "yes")) return false;
  if (p.newContent === "" && p.oldContent !== "") {
    unlinkSync(p.path);
  } else {
    writeFileSync(p.path, p.newContent, "utf-8");
  }
  return true;
}

async function approve(call: ToolCall): Promise<boolean> {
  const warn =
    call.function.name === "run_command"
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
    `bagent — diff 预览 + Accept 写盘 · 工具：${toolNames}\n` +
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
    for await (const event of agent.turn(user, approve, askUser, editApply)) {
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
      if (event.type === "EditProposal") {
        pendingEdit = {
          path: event.path,
          oldContent: event.oldContent,
          newContent: event.newContent,
        };
        console.log(
          color.warn(
            `[diff] ${event.tool} → ${event.path}（终端无图形 diff，将询问是否写盘）`,
          ),
        );
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
