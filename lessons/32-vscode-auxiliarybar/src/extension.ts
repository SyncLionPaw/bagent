import * as vscode from "vscode";
import {
  DEFAULT_API_KEY_PATH,
  loadDeepSeekApiKey,
  resolveApiKeyPath,
} from "./apiKey";
import { ChatSidebarProvider } from "./sidebar";
import { AgentProcess } from "./spawn";

let agent: AgentProcess | null = null;

async function openBagentPanel(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
  await vscode.commands.executeCommand("bagent32.chat.focus");
}

export function activate(context: vscode.ExtensionContext) {
  const cwd =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.extensionPath;

  const config = vscode.workspace.getConfiguration("bagent32");
  const deepseekPath = resolveApiKeyPath(
    config.get<string>("apiKeyPath", DEFAULT_API_KEY_PATH),
    cwd,
  );

  const apiKey = loadDeepSeekApiKey(deepseekPath);
  if (!apiKey) {
    void vscode.window.showErrorMessage(
      `bagent: 未找到 DeepSeek API Key。请创建 ${deepseekPath}（单行 sk-...），或 export DEEPSEEK_API_KEY。`,
    );
    return;
  }

  agent = new AgentProcess();
  agent.start(context.extensionPath, cwd, { DEEPSEEK_API_KEY: apiKey });
  context.subscriptions.push({ dispose: () => agent?.shutdown() });

  const sidebar = new ChatSidebarProvider(agent);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("bagent32.chat", sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("bagent32.open", () => openBagentPanel()),
  );
}

export function deactivate() {
  agent?.shutdown();
  agent = null;
}
