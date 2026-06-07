"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
const balance_1 = require("./utils/balance");
const config_1 = require("./utils/config");
const models_1 = require("./utils/models");
const reminder_1 = require("./utils/reminder");
const slash_1 = require("./utils/slash");
function getHtml(currentModel) {
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
    .tool.auto-approved {
      border-left-color: var(--vscode-charts-green, #89d185);
      color: var(--vscode-charts-green, #89d185);
    }
    .tool-auto {
      font-weight: 600; opacity: 0.95;
    }
    .pending {
      font-size: 12px; padding: 6px 8px;
      border: 1px solid var(--vscode-charts-yellow);
      border-radius: 4px; background: var(--vscode-editor-background);
    }
    .pending.danger {
      border-color: var(--vscode-errorForeground);
    }
    .pending.danger .pending-name {
      color: var(--vscode-errorForeground);
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
    .ask-user {
      font-size: 12px; padding: 8px; max-width: 92%;
      border: 1px solid var(--vscode-focusBorder);
      border-radius: 4px;
      background: var(--vscode-editor-background);
    }
    .ask-label { font-weight: 600; margin-bottom: 4px; }
    .ask-q {
      margin-bottom: 6px; white-space: pre-wrap; word-break: break-word;
    }
    .ask-user textarea {
      width: 100%; margin-bottom: 6px; padding: 6px 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px; font: inherit; resize: vertical;
    }
    .ask-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .ask-actions button {
      cursor: pointer; padding: 4px 10px; border-radius: 3px; font-size: 12px;
    }
    .ask-submit {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground); border: none;
    }
    .ask-skip {
      background: var(--vscode-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border);
    }
    .plan-card {
      align-self: flex-start; max-width: 96%;
      font-size: 12px; padding: 8px 10px;
      border: 1px solid var(--vscode-charts-blue, #3794ff);
      border-radius: 6px;
      background: var(--vscode-editor-background);
    }
    .plan-card.plan-deleted {
      border-color: var(--vscode-descriptionForeground);
      opacity: 0.85;
    }
    .plan-head {
      display: flex; align-items: center; gap: 8px;
      flex-wrap: wrap; margin-bottom: 6px;
    }
    .plan-name { font-weight: 600; }
    .plan-method {
      font-size: 11px; opacity: 0.75;
      padding: 1px 6px; border-radius: 3px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .plan-progress {
      margin-left: auto; font-variant-numeric: tabular-nums;
      font-weight: 600;
      color: var(--vscode-charts-green, #89d185);
    }
    .plan-bar {
      height: 4px; border-radius: 2px; margin-bottom: 8px;
      background: var(--vscode-progressBar-background, rgba(128,128,128,0.25));
      overflow: hidden;
    }
    .plan-bar-fill {
      height: 100%; border-radius: 2px;
      background: var(--vscode-charts-green, #89d185);
      transition: width 0.2s ease;
    }
    .plan-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: 4px;
    }
    .plan-item {
      display: flex; align-items: flex-start; gap: 6px;
      line-height: 1.4; word-break: break-word;
    }
    .plan-check {
      flex-shrink: 0; width: 14px; text-align: center;
      font-size: 11px; opacity: 0.9;
    }
    .plan-item.done { opacity: 0.72; text-decoration: line-through; }
    .plan-item.done .plan-check { color: var(--vscode-charts-green, #89d185); }
    .plan-empty { opacity: 0.7; font-style: italic; }
  </style>
</head>
<body>
  <div class="hint" id="hint">reminder 注入 · 模型 ${currentModel} · /config</div>
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
    let lastToolEl = null;

    function scroll() { log.scrollTop = log.scrollHeight; }

    function setBusy(busy) {
      input.disabled = busy;
      sendBtn.disabled = busy;
      modelsBtn.disabled = busy;
    }

    function stripReminder(text) {
      return text.replace(/<reminder>[\\s\\S]*?<\\/reminder>/gi, "").trimEnd();
    }

    const PLAN_METHOD_LABEL = {
      read: "查看",
      new: "新建",
      replace: "重写",
      update: "更新",
      delete: "删除",
    };

    function parsePlanArgs(argsJson) {
      try {
        const a = JSON.parse(argsJson);
        return {
          method: a.method || "?",
          name: a.name || "?",
        };
      } catch {
        return { method: "?", name: "?" };
      }
    }

    function renderPlanCard(ev) {
      const card = document.createElement("div");
      card.className = "plan-card" + (ev.deleted ? " plan-deleted" : "");
      const head = document.createElement("div");
      head.className = "plan-head";
      const nameEl = document.createElement("span");
      nameEl.className = "plan-name";
      nameEl.textContent = ev.name;
      const methodEl = document.createElement("span");
      methodEl.className = "plan-method";
      methodEl.textContent = PLAN_METHOD_LABEL[ev.method] || ev.method;
      head.appendChild(nameEl);
      head.appendChild(methodEl);
      if (!ev.deleted && ev.total > 0) {
        const prog = document.createElement("span");
        prog.className = "plan-progress";
        prog.textContent = ev.done + "/" + ev.total;
        head.appendChild(prog);
      }
      card.appendChild(head);

      if (ev.deleted) {
        const note = document.createElement("div");
        note.className = "plan-empty";
        note.textContent = "计划已删除";
        card.appendChild(note);
        log.appendChild(card);
        scroll();
        return;
      }

      if (ev.total > 0) {
        const bar = document.createElement("div");
        bar.className = "plan-bar";
        const fill = document.createElement("div");
        fill.className = "plan-bar-fill";
        fill.style.width = Math.round((ev.done / ev.total) * 100) + "%";
        bar.appendChild(fill);
        card.appendChild(bar);
      }

      const list = document.createElement("ul");
      list.className = "plan-list";
      if (!ev.todos.length) {
        const empty = document.createElement("div");
        empty.className = "plan-empty";
        empty.textContent = "（暂无待办条目）";
        card.appendChild(empty);
      } else {
        for (const item of ev.todos) {
          const li = document.createElement("li");
          li.className = "plan-item" + (item.done ? " done" : "");
          const mark = document.createElement("span");
          mark.className = "plan-check";
          mark.textContent = item.done ? "✓" : "○";
          const text = document.createElement("span");
          text.textContent = item.text;
          li.appendChild(mark);
          li.appendChild(text);
          list.appendChild(li);
        }
        card.appendChild(list);
      }
      log.appendChild(card);
      scroll();
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
      const text = stripReminder(input.value.trim());
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
          if (ev.name === "plan_operate") {
            const pa = parsePlanArgs(ev.arguments);
            t.textContent =
              "[计划] " + pa.name + " · " + (PLAN_METHOD_LABEL[pa.method] || pa.method);
          } else {
            t.textContent = "[工具] " + ev.name + "(" + ev.arguments + ")";
          }
          log.appendChild(t);
          lastToolEl = t;
          scroll();
        }

        if (ev.type === "PlanUpdated") {
          renderPlanCard(ev);
        }

        if (ev.type === "ToolCallAutoApproved") {
          if (lastToolEl) {
            lastToolEl.classList.add("auto-approved");
            const badge = document.createElement("span");
            badge.className = "tool-auto";
            badge.textContent = " · 自动放行";
            lastToolEl.appendChild(badge);
          }
          scroll();
        }

        if (ev.type === "AskUserPending") {
          setBusy(true);
          const box = document.createElement("div");
          box.className = "ask-user";
          const label = document.createElement("div");
          label.className = "ask-label";
          label.textContent = "Agent 向你追问";
          const q = document.createElement("div");
          q.className = "ask-q";
          q.textContent = ev.question;
          const ta = document.createElement("textarea");
          ta.className = "ask-input";
          ta.rows = 2;
          ta.placeholder = "补充信息…";
          const actions = document.createElement("div");
          actions.className = "ask-actions";
          const submit = document.createElement("button");
          submit.type = "button";
          submit.className = "ask-submit";
          submit.textContent = "提交";
          const skip = document.createElement("button");
          skip.type = "button";
          skip.className = "ask-skip";
          skip.textContent = "跳过";
          submit.addEventListener("click", () => {
            const ans = stripReminder(ta.value.trim());
            if (!ans) return;
            actions.innerHTML = "<span>已提交</span>";
            const u = document.createElement("div");
            u.className = "user";
            u.textContent = ans;
            log.appendChild(u);
            scroll();
            vscode.postMessage({ type: "askUserAnswer", answer: ans });
          });
          skip.addEventListener("click", () => {
            actions.innerHTML = "<span>已跳过</span>";
            vscode.postMessage({ type: "askUserSkip" });
          });
          actions.appendChild(submit);
          actions.appendChild(skip);
          box.appendChild(label);
          box.appendChild(q);
          box.appendChild(ta);
          box.appendChild(actions);
          log.appendChild(box);
          scroll();
          ta.focus();
        }

        if (ev.type === "ToolCallPending") {
          pendingEl = document.createElement("div");
          pendingEl.className = "pending" + (ev.name === "write_file" ? " danger" : "");
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
          if (ev.name === "plan_operate") {
            pendingEl = null;
            scroll();
            return;
          }
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
class ChatSidebarProvider {
    agent;
    apiKey;
    config;
    currentModel;
    constructor(agent, apiKey, initialModel, config) {
        this.agent = agent;
        this.apiKey = apiKey;
        this.config = config;
        this.currentModel = initialModel;
    }
    buildConfigInfo() {
        return {
            model: this.currentModel,
            cwd: this.config.cwd,
            apiKeySource: this.config.apiKeyFromEnv
                ? "环境变量 DEEPSEEK_API_KEY"
                : "文件",
            apiKeyPath: this.config.apiKeyFromEnv ? undefined : this.config.apiKeyPath,
            apiKeyPreview: (0, config_1.maskApiKey)(this.apiKey),
            webSearchEnabled: this.config.webSearchEnabled,
            tavilySource: this.config.webSearchEnabled
                ? this.config.tavilyFromEnv
                    ? "环境变量 TAVILY_API_KEY"
                    : "文件"
                : undefined,
            tavilyApiKeyPath: this.config.webSearchEnabled
                ? undefined
                : this.config.tavilyApiKeyPath,
        };
    }
    showConfig(webview) {
        this.postSys(webview, (0, config_1.formatConfig)(this.buildConfigInfo()));
    }
    postSys(webview, text) {
        webview.postMessage({ type: "models", text });
    }
    async showModels(webview) {
        const models = await (0, models_1.listModels)(this.apiKey);
        this.postSys(webview, (0, models_1.formatModelList)(models, this.currentModel));
    }
    async showBalance(webview) {
        const balance = await (0, balance_1.fetchBalance)(this.apiKey);
        this.postSys(webview, (0, balance_1.formatBalance)(balance));
    }
    switchModel(webview, modelId) {
        this.agent.setModel(modelId);
        this.currentModel = modelId;
        webview.postMessage({ type: "modelChanged", model: modelId });
        webview.postMessage({
            type: "sys",
            text: `已切换模型 → ${modelId}`,
        });
    }
    resolveWebviewView(webviewView) {
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = getHtml(this.currentModel);
        webviewView.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "approve") {
                try {
                    this.agent.approve(msg.allow === true);
                }
                catch (err) {
                    const text = err instanceof Error ? err.message : String(err);
                    webviewView.webview.postMessage({ type: "error", message: text });
                }
                return;
            }
            if (msg.type === "askUserAnswer") {
                try {
                    this.agent.answerAskUser(msg.answer?.trim() ?? "");
                }
                catch (err) {
                    const text = err instanceof Error ? err.message : String(err);
                    webviewView.webview.postMessage({ type: "error", message: text });
                }
                return;
            }
            if (msg.type === "askUserSkip") {
                try {
                    this.agent.skipAskUser();
                }
                catch (err) {
                    const text = err instanceof Error ? err.message : String(err);
                    webviewView.webview.postMessage({ type: "error", message: text });
                }
                return;
            }
            if (msg.type === "listModels") {
                try {
                    await this.showModels(webviewView.webview);
                }
                catch (err) {
                    const text = err instanceof Error ? err.message : String(err);
                    webviewView.webview.postMessage({ type: "error", message: text });
                }
                return;
            }
            if (msg.type !== "ask" || !msg.message?.trim())
                return;
            const userMessage = (0, reminder_1.stripReminder)(msg.message.trim());
            if (!userMessage) {
                webviewView.webview.postMessage({ type: "done" });
                return;
            }
            const action = (0, slash_1.parseSlashCommand)(userMessage);
            if (action.type === "list_models") {
                try {
                    await this.showModels(webviewView.webview);
                    webviewView.webview.postMessage({ type: "done" });
                }
                catch (err) {
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
                }
                catch (err) {
                    const text = err instanceof Error ? err.message : String(err);
                    webviewView.webview.postMessage({ type: "error", message: text });
                }
                return;
            }
            if (action.type === "help") {
                this.postSys(webviewView.webview, (0, slash_1.slashHelpText)());
                webviewView.webview.postMessage({ type: "done" });
                return;
            }
            if (action.type === "show_config") {
                this.showConfig(webviewView.webview);
                webviewView.webview.postMessage({ type: "done" });
                return;
            }
            try {
                await this.agent.chat(userMessage, (event) => {
                    webviewView.webview.postMessage({ type: "event", event });
                });
                webviewView.webview.postMessage({ type: "done" });
            }
            catch (err) {
                const text = err instanceof Error ? err.message : String(err);
                webviewView.webview.postMessage({ type: "error", message: text });
                vscode.window.showErrorMessage(`bagent: ${text}`);
            }
        });
    }
}
exports.ChatSidebarProvider = ChatSidebarProvider;
//# sourceMappingURL=sidebar.js.map