import * as vscode from "vscode";
import {
  DEFAULT_API_KEY_PATH,
  DEFAULT_TAVILY_KEY_PATH,
  loadDeepSeekApiKey,
  loadTavilyApiKey,
  resolveApiKeyPath,
} from "./apiKey";
import { registerDiffContentProvider, registerEditCommands } from "./diffPreview";
import { ChatSidebarProvider } from "./sidebar";
import { AgentProcess } from "./spawn";
import { DEFAULT_MODEL } from "./utils/models";

let agent: AgentProcess | null = null;

async function openBagentPanel(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
  await vscode.commands.executeCommand("bagent53.chat.focus");
}

export function activate(context: vscode.ExtensionContext) {
  registerDiffContentProvider(context);
  registerEditCommands(context);

  const cwd =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.extensionPath;

  const config = vscode.workspace.getConfiguration("bagent53");
  const deepseekPath = resolveApiKeyPath(
    config.get<string>("apiKeyPath", DEFAULT_API_KEY_PATH),
    cwd,
  );
  const tavilyPath = resolveApiKeyPath(
    config.get<string>("tavilyApiKeyPath", DEFAULT_TAVILY_KEY_PATH),
    cwd,
  );

  const apiKey = loadDeepSeekApiKey(deepseekPath);
  if (!apiKey) {
    void vscode.window.showErrorMessage(
      `bagent: 未找到 DeepSeek API Key。请创建 ${deepseekPath}（单行 sk-...），或 export DEEPSEEK_API_KEY。`,
    );
    return;
  }

  const tavilyKey = loadTavilyApiKey(tavilyPath);
  if (!tavilyKey) {
    void vscode.window.showWarningMessage(
      `bagent: 未配置 Tavily Key（${tavilyPath}）。无 web_search；本地工具仍可用。`,
    );
  }

  const agentEnv: Record<string, string> = {
    DEEPSEEK_API_KEY: apiKey,
    DEEPSEEK_MODEL: DEFAULT_MODEL,
  };
  if (tavilyKey) agentEnv.TAVILY_API_KEY = tavilyKey;

  const proc = new AgentProcess();
  proc.start(context.extensionPath, cwd, agentEnv);
  agent = proc;
  context.subscriptions.push({ dispose: () => agent?.shutdown() });

  const sidebar = new ChatSidebarProvider(agent, apiKey, DEFAULT_MODEL, {
    cwd,
    apiKeyPath: deepseekPath,
    apiKeyFromEnv: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
    tavilyApiKeyPath: tavilyPath,
    webSearchEnabled: Boolean(tavilyKey),
    tavilyFromEnv: Boolean(process.env.TAVILY_API_KEY?.trim()),
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("bagent53.chat", sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("bagent53.open", () => openBagentPanel()),
  );
}

export function deactivate() {
  agent?.shutdown();
  agent = null;
}
