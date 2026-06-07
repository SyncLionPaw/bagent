import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "../36-tool-hooks/color.js";
import { AgentLoop } from "../36-tool-hooks/loop.js";
import type { ToolCall } from "../36-tool-hooks/messages.js";
import { handleTerminalEvent } from "../36-tool-hooks/terminal.js";
import { fetchBalance, formatBalance } from "./src/utils/balance.js";
import { formatConfig, maskApiKey } from "./src/utils/config.js";
import {
  DEFAULT_MODEL,
  formatModelList,
  listModels,
} from "./src/utils/models.js";
import { parseSlashCommand, slashHelpText } from "./src/utils/slash.js";
import {
  DEFAULT_API_KEY_PATH,
  loadDeepSeekApiKey,
  resolveApiKeyPath,
} from "./src/apiKey.js";

const apiKeyPath = resolveApiKeyPath(
  process.env.BAGENT_API_KEY_PATH ?? DEFAULT_API_KEY_PATH,
);
const apiKey = loadDeepSeekApiKey(apiKeyPath);
if (!apiKey) {
  console.error(
    `请先 export DEEPSEEK_API_KEY，或创建 ${apiKeyPath}（单行 sk-...）`,
  );
  process.exit(1);
}

const apiKeyFromEnv = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
let currentModel = process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
process.env.DEEPSEEK_MODEL = currentModel;

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

console.log(
  `斜杠命令 — 当前模型 ${currentModel}，/help 查看全部，/quit 退出\n`,
);

while (true) {
  const user = await rl.question(`${color.user("你:")} `);
  if (user === "/quit" || user === "exit") break;
  if (!user.trim()) continue;

  const slash = parseSlashCommand(user);
  if (slash.type === "list_models") {
    try {
      const models = await listModels(apiKey);
      console.log(color.meta(formatModelList(models, currentModel) + "\n"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(color.error(`[错误] ${msg}\n`));
    }
    continue;
  }
  if (slash.type === "set_model") {
    currentModel = slash.modelId;
    process.env.DEEPSEEK_MODEL = currentModel;
    console.log(color.meta(`已切换模型 → ${currentModel}\n`));
    continue;
  }
  if (slash.type === "show_balance") {
    try {
      const balance = await fetchBalance(apiKey);
      console.log(color.meta(formatBalance(balance) + "\n"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(color.error(`[错误] ${msg}\n`));
    }
    continue;
  }
  if (slash.type === "help") {
    console.log(color.meta(slashHelpText() + "\n"));
    continue;
  }
  if (slash.type === "show_config") {
    console.log(
      color.meta(
        formatConfig({
          model: currentModel,
          cwd: process.cwd(),
          apiKeySource: apiKeyFromEnv
            ? "环境变量 DEEPSEEK_API_KEY"
            : "文件",
          apiKeyPath: apiKeyFromEnv ? undefined : apiKeyPath,
          apiKeyPreview: maskApiKey(apiKey),
        }) + "\n",
      ),
    );
    continue;
  }

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
