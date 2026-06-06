import * as vscode from "vscode";
import type { AgentEvent } from "./events";
import type { AgentProcess } from "./spawn";

function getHtml(): string {
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
    .tool {
      font-size: 12px; opacity: 0.85;
      padding: 4px 8px; border-left: 3px solid var(--vscode-charts-yellow);
    }
    .err { color: var(--vscode-errorForeground); }
    form { display: flex; gap: 6px; margin-top: 8px; }
    input {
      flex: 1; padding: 6px 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    button {
      padding: 6px 12px; cursor: pointer;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 4px;
    }
    button:disabled { opacity: 0.5; cursor: default; }
    .hint { font-size: 11px; opacity: 0.65; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="hint">插件已 spawn Agent 子进程（stdio），无需 ch28:server</div>
  <div id="log"></div>
  <form id="f">
    <input id="q" placeholder="问 Agent…" autocomplete="off" />
    <button type="submit">发送</button>
  </form>
  <script>
    const vscode = acquireVsCodeApi();
    const log = document.getElementById("log");
    const form = document.getElementById("f");
    const input = document.getElementById("q");
    let aiEl = null;

    function scroll() { log.scrollTop = log.scrollHeight; }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      input.disabled = true;
      form.querySelector("button").disabled = true;
      const u = document.createElement("div");
      u.className = "user";
      u.textContent = text;
      log.appendChild(u);
      aiEl = null;
      scroll();
      vscode.postMessage({ type: "ask", message: text });
    });

    window.addEventListener("message", (e) => {
      const msg = e.data;
      if (msg.type === "event") {
        const ev = msg.event;
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
          const t = document.createElement("div");
          t.className = "tool";
          t.textContent = "[工具] " + ev.name + "(" + ev.arguments + ")";
          log.appendChild(t);
          scroll();
        }
        if (ev.type === "ToolResult") {
          const t = document.createElement("div");
          t.className = "tool";
          const p = ev.output.length > 100 ? ev.output.slice(0, 100) + "…" : ev.output;
          t.textContent = "  → " + p.replace(/\\n/g, " ");
          log.appendChild(t);
          scroll();
        }
      }
      if (msg.type === "done") {
        aiEl = null;
        input.disabled = false;
        form.querySelector("button").disabled = false;
        input.focus();
      }
      if (msg.type === "error") {
        aiEl = null;
        const err = document.createElement("div");
        err.className = "err";
        err.textContent = msg.message;
        log.appendChild(err);
        input.disabled = false;
        form.querySelector("button").disabled = false;
        scroll();
      }
    });
    input.focus();
  </script>
</body>
</html>`;
}

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly agent: AgentProcess) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getHtml();

    webviewView.webview.onDidReceiveMessage(async (msg: { type: string; message?: string }) => {
      if (msg.type !== "ask" || !msg.message?.trim()) return;

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
