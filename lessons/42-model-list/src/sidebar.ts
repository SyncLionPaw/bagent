import * as vscode from "vscode";
import type { AgentEvent } from "./events";
import type { AgentProcess } from "./spawn";
import { fetchBalance, formatBalance } from "./utils/balance";
import { formatConfig, maskApiKey, type AgentConfigInfo } from "./utils/config";
import { formatModelList, listModels } from "./utils/models";
import { parseSlashCommand, slashHelpText } from "./utils/slash";

type SidebarConfig = {
  cwd: string;
  apiKeyPath: string;
  apiKeyFromEnv: boolean;
};

function getHtml(currentModel: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 8px;
      font: 13px/1.5 var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      display: flex; flex-direction: column; height: 100vh;
    }
    #log { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .user {
      align-self: flex-end; max-width: 92%;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 6px 10px; border-radius: 8px 8px 2px 8px;
      white-space: pre-wrap; word-break: break-word;
    }
    .ai {
      align-self: flex-start; max-width: 92%;
      background: var(--vscode-editor-inactiveSelectionBackground);
      padding: 6px 10px; border-radius: 8px 8px 8px 2px;
      white-space: pre-wrap; word-break: break-word;
    }
    .thinking {
      align-self: flex-start; max-width: 92%;
      font-size: 12px; opacity: 0.72;
      border-left: 3px solid var(--vscode-descriptionForeground);
      border-radius: 2px;
    }
    .thinking summary {
      cursor: pointer; padding: 4px 8px; font-style: italic;
      list-style: none; user-select: none;
    }
    .thinking summary::-webkit-details-marker { display: none; }
    .thinking summary::before {
      content: "▶ "; font-size: 9px; opacity: 0.7;
    }
    .thinking[open] summary::before { content: "▼ "; }
    .thinking-body {
      padding: 4px 8px 6px; font-style: italic;
      white-space: pre-wrap; word-break: break-word;
      border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
    }
    .tool {
      font-size: 12px; opacity: 0.85;
      padding: 4px 8px; border-left: 3px solid var(--vscode-charts-yellow);
    }
    .pending {
      font-size: 12px; padding: 6px 8px;
      border: 1px solid var(--vscode-charts-yellow);
      border-radius: 4px; background: var(--vscode-editor-background);
    }
    .pending-row {
      display: flex; align-items: center; gap: 6px;
      flex-wrap: nowrap; min-width: 0;
    }
    .pending-info {
      flex: 1; min-width: 0; overflow: hidden;
      white-space: nowrap; text-overflow: ellipsis;
    }
    .pending-name { font-weight: 600; }
    .pending-args {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px; opacity: 0.85;
    }
    .pending .actions {
      display: flex; flex-shrink: 0; gap: 4px; flex-wrap: nowrap;
    }
    .pending button {
      padding: 4px; font-size: 12px; cursor: pointer;
      border: none; border-radius: 3px;
    }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 6px; min-width: 28px; min-height: 28px; line-height: 0;
    }
    .icon-btn svg { width: 16px; height: 16px; fill: currentColor; }
    .pending .icon-btn { min-width: 24px; min-height: 24px; flex-shrink: 0; }
    .pending .allow {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .pending .deny {
      background: var(--vscode-input-background);
      color: var(--vscode-errorForeground);
      border: 1px solid var(--vscode-input-border);
    }
    .denied { color: var(--vscode-errorForeground); font-size: 12px; padding-left: 8px; }
    .trunc { font-size: 11px; color: var(--vscode-charts-yellow); padding-left: 8px; }
    .err { color: var(--vscode-errorForeground); }
    form { display: flex; gap: 6px; margin-top: 8px; }
    input {
      flex: 1; padding: 6px 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    button.send, button.models {
      cursor: pointer;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 4px;
    }
    button.models {
      background: var(--vscode-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border);
    }
    button:disabled { opacity: 0.5; cursor: default; }
    .hint { font-size: 11px; opacity: 0.65; margin-bottom: 6px; }
    .sys {
      align-self: flex-start; max-width: 92%;
      font-size: 12px; opacity: 0.88;
      padding: 6px 10px; border-radius: 6px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35));
      white-space: pre-wrap; word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
    }
  </style>
</head>
<body>
  <div class="hint" id="hint">模型：${currentModel} · /config · /help</div>
  <div id="log"></div>
  <form id="f">
    <input id="q" placeholder="问 Agent… 或 /help" autocomplete="off" />
    <button type="button" class="models icon-btn" id="modelsBtn" title="查看模型列表" aria-label="查看模型列表"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v2A1.5 1.5 0 0 1 12.5 7h-9A1.5 1.5 0 0 1 2 5.5v-2zm0 5A1.5 1.5 0 0 1 3.5 8h9a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-2z"/></svg></button>
    <button type="submit" class="send icon-btn" title="发送" aria-label="发送"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 12.5 8.5H9.5v5.5h-3V8.5H3.5L8 2.5z"/></svg></button>
  </form>
  <script>
    const vscode = acquireVsCodeApi();
    const log = document.getElementById("log");
    const form = document.getElementById("f");
    const input = document.getElementById("q");
    const sendBtn = form.querySelector("button.send");
    const modelsBtn = document.getElementById("modelsBtn");
    const hintEl = document.getElementById("hint");
    let aiEl = null;
    let thinkingEl = null;
    let thinkingBodyEl = null;
    let pendingEl = null;

    function scroll() { log.scrollTop = log.scrollHeight; }

    function setBusy(busy) {
      input.disabled = busy;
      sendBtn.disabled = busy;
      modelsBtn.disabled = busy;
    }

    function appendSys(text) {
      const el = document.createElement("div");
      el.className = "sys";
      el.textContent = text;
      log.appendChild(el);
      scroll();
    }

    modelsBtn.addEventListener("click", () => {
      setBusy(true);
      vscode.postMessage({ type: "listModels" });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      setBusy(true);
      const u = document.createElement("div");
      u.className = "user";
      u.textContent = text;
      log.appendChild(u);
      aiEl = null;
      thinkingEl = null;
      thinkingBodyEl = null;
      pendingEl = null;
      scroll();
      vscode.postMessage({ type: "ask", message: text });
    });

    window.addEventListener("message", (e) => {
      const msg = e.data;
      if (msg.type === "event") {
        const ev = msg.event;

        if (ev.type === "ThinkingStart") {
          aiEl = null;
          thinkingEl = document.createElement("details");
          thinkingEl.className = "thinking";
          const summary = document.createElement("summary");
          summary.textContent = "思考";
          thinkingBodyEl = document.createElement("div");
          thinkingBodyEl.className = "thinking-body";
          thinkingEl.appendChild(summary);
          thinkingEl.appendChild(thinkingBodyEl);
          log.appendChild(thinkingEl);
          scroll();
        }
        if (ev.type === "ThinkingUpdated" && thinkingBodyEl) {
          thinkingBodyEl.textContent += ev.text;
          scroll();
        }
        if (ev.type === "ThinkingEnd") {
          thinkingEl = null;
          thinkingBodyEl = null;
        }

        if (ev.type === "ChunkUpdated") {
          if (!aiEl) {
            aiEl = document.createElement("div");
            aiEl.className = "ai";
            log.appendChild(aiEl);
          }
          aiEl.textContent += ev.text;
          scroll();
        }

        if (ev.type === "ToolCallStart") {
          aiEl = null;
          thinkingEl = null;
          thinkingBodyEl = null;
          const t = document.createElement("div");
          t.className = "tool";
          t.textContent = "[工具] " + ev.name + "(" + ev.arguments + ")";
          log.appendChild(t);
          scroll();
        }

        if (ev.type === "ToolCallPending") {
          pendingEl = document.createElement("div");
          pendingEl.className = "pending";
          const argsEsc = ev.arguments.replace(/</g, "&lt;").replace(/"/g, "&quot;");
          const fullLabel = ev.name + "(" + ev.arguments + ")";
          pendingEl.innerHTML =
            '<div class="pending-row">' +
            '<div class="pending-info" title="' + fullLabel.replace(/"/g, "&quot;") + '">' +
            '<span class="pending-name">' + ev.name + '</span>' +
            '<span class="pending-args">(' + argsEsc + ')</span></div>' +
            '<div class="actions">' +
            '<button class="allow icon-btn" title="允许" aria-label="允许"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg></button>' +
            '<button class="deny icon-btn" title="拒绝" aria-label="拒绝"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg></button></div></div>';
          pendingEl.querySelector(".allow").addEventListener("click", () => {
            pendingEl.querySelector(".actions").innerHTML = '<span title="已允许">✓</span>';
            vscode.postMessage({ type: "approve", allow: true });
          });
          pendingEl.querySelector(".deny").addEventListener("click", () => {
            pendingEl.querySelector(".actions").innerHTML = '<span title="已拒绝">✗</span>';
            vscode.postMessage({ type: "approve", allow: false });
          });
          log.appendChild(pendingEl);
          scroll();
        }

        if (ev.type === "ToolCallDenied") {
          const d = document.createElement("div");
          d.className = "denied";
          d.textContent = "✗ 已拒绝 " + ev.name;
          log.appendChild(d);
          pendingEl = null;
          scroll();
        }

        if (ev.type === "ToolResult") {
          const t = document.createElement("div");
          t.className = "tool";
          const p = ev.output.length > 100 ? ev.output.slice(0, 100) + "…" : ev.output;
          t.textContent = "  → " + p.replace(/\\n/g, " ");
          log.appendChild(t);
          if (ev.truncated && ev.originalLength) {
            const note = document.createElement("div");
            note.className = "trunc";
            note.textContent =
              "（已截断：原文 " + ev.originalLength + " 字符 → history " + ev.output.length + " 字符）";
            log.appendChild(note);
          }
          pendingEl = null;
          scroll();
        }
      }
      if (msg.type === "done") {
        aiEl = null;
        thinkingEl = null;
        thinkingBodyEl = null;
        pendingEl = null;
        setBusy(false);
        input.focus();
      }
      if (msg.type === "error") {
        aiEl = null;
        thinkingEl = null;
        thinkingBodyEl = null;
        pendingEl = null;
        const err = document.createElement("div");
        err.className = "err";
        err.textContent = msg.message;
        log.appendChild(err);
        setBusy(false);
        scroll();
      }
      if (msg.type === "models" || msg.type === "sys") {
        appendSys(msg.text);
        setBusy(false);
        input.focus();
      }
      if (msg.type === "modelChanged" && msg.model) {
        hintEl.textContent = "模型：" + msg.model + " · /config · /help";
        setBusy(false);
        input.focus();
      }
    });
    input.focus();
  </script>
</body>
</html>`;
}

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
  private currentModel: string;

  constructor(
    private readonly agent: AgentProcess,
    private readonly apiKey: string,
    initialModel: string,
    private readonly config: SidebarConfig,
  ) {
    this.currentModel = initialModel;
  }

  private buildConfigInfo(): AgentConfigInfo {
    return {
      model: this.currentModel,
      cwd: this.config.cwd,
      apiKeySource: this.config.apiKeyFromEnv
        ? "环境变量 DEEPSEEK_API_KEY"
        : "文件",
      apiKeyPath: this.config.apiKeyFromEnv ? undefined : this.config.apiKeyPath,
      apiKeyPreview: maskApiKey(this.apiKey),
    };
  }

  private showConfig(webview: vscode.Webview): void {
    this.postSys(webview, formatConfig(this.buildConfigInfo()));
  }

  private postSys(webview: vscode.Webview, text: string): void {
    webview.postMessage({ type: "models", text });
  }

  private async showModels(webview: vscode.Webview): Promise<void> {
    const models = await listModels(this.apiKey);
    this.postSys(webview, formatModelList(models, this.currentModel));
  }

  private async showBalance(webview: vscode.Webview): Promise<void> {
    const balance = await fetchBalance(this.apiKey);
    this.postSys(webview, formatBalance(balance));
  }

  private switchModel(webview: vscode.Webview, modelId: string): void {
    this.agent.setModel(modelId);
    this.currentModel = modelId;
    webview.postMessage({ type: "modelChanged", model: modelId });
    webview.postMessage({
      type: "sys",
      text: `已切换模型 → ${modelId}`,
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getHtml(this.currentModel);

    webviewView.webview.onDidReceiveMessage(async (msg: {
      type: string;
      message?: string;
      allow?: boolean;
    }) => {
      if (msg.type === "approve") {
        try {
          this.agent.approve(msg.allow === true);
        } catch (err) {
          const text = err instanceof Error ? err.message : String(err);
          webviewView.webview.postMessage({ type: "error", message: text });
        }
        return;
      }

      if (msg.type === "listModels") {
        try {
          await this.showModels(webviewView.webview);
        } catch (err) {
          const text = err instanceof Error ? err.message : String(err);
          webviewView.webview.postMessage({ type: "error", message: text });
        }
        return;
      }

      if (msg.type !== "ask" || !msg.message?.trim()) return;

      const action = parseSlashCommand(msg.message.trim());
      if (action.type === "list_models") {
        try {
          await this.showModels(webviewView.webview);
          webviewView.webview.postMessage({ type: "done" });
        } catch (err) {
          const text = err instanceof Error ? err.message : String(err);
          webviewView.webview.postMessage({ type: "error", message: text });
        }
        return;
      }
      if (action.type === "set_model") {
        this.switchModel(webviewView.webview, action.modelId);
        webviewView.webview.postMessage({ type: "done" });
        return;
      }
      if (action.type === "show_balance") {
        try {
          await this.showBalance(webviewView.webview);
          webviewView.webview.postMessage({ type: "done" });
        } catch (err) {
          const text = err instanceof Error ? err.message : String(err);
          webviewView.webview.postMessage({ type: "error", message: text });
        }
        return;
      }
      if (action.type === "help") {
        this.postSys(webviewView.webview, slashHelpText());
        webviewView.webview.postMessage({ type: "done" });
        return;
      }
      if (action.type === "show_config") {
        this.showConfig(webviewView.webview);
        webviewView.webview.postMessage({ type: "done" });
        return;
      }

      try {
        await this.agent.chat(msg.message.trim(), (event: AgentEvent) => {
          webviewView.webview.postMessage({ type: "event", event });
        });
        webviewView.webview.postMessage({ type: "done" });
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        webviewView.webview.postMessage({ type: "error", message: text });
        vscode.window.showErrorMessage(`bagent: ${text}`);
      }
    });
  }
}
