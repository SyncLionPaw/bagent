"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculatorPanelProvider = void 0;
const eval_1 = require("./eval");
function getHtml() {
    return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 10px;
      font: 13px/1.4 var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    #display {
      width: 100%; margin-bottom: 8px; padding: 8px;
      font-size: 18px; text-align: right;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    button {
      padding: 10px 0; cursor: pointer;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-radius: 4px;
      font-size: 14px;
    }
    button.op { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    button.wide { grid-column: span 2; }
    button.eq { background: var(--vscode-charts-green); color: var(--vscode-editor-background); font-weight: bold; }
    #err { min-height: 1.2em; margin-top: 6px; color: var(--vscode-errorForeground); font-size: 12px; }
  </style>
</head>
<body>
  <input id="display" type="text" readonly placeholder="0" />
  <div class="grid" id="keys"></div>
  <div id="err"></div>
  <script>
    const vscode = acquireVsCodeApi();
    const display = document.getElementById("display");
    const errEl = document.getElementById("err");
    const rows = [
      ["C", "(", ")", "/"],
      ["7", "8", "9", "*"],
      ["4", "5", "6", "-"],
      ["1", "2", "3", "+"],
      ["0", ".", "="],
    ];
    const grid = document.getElementById("keys");
    for (const row of rows) {
      for (const k of row) {
        const btn = document.createElement("button");
        btn.textContent = k;
        if ("+-*/".includes(k)) btn.classList.add("op");
        if (k === "=") {
          btn.classList.add("eq", "wide");
          btn.onclick = () => {
            errEl.textContent = "";
            vscode.postMessage({ type: "eval", expr: display.value });
          };
        } else if (k === "C") {
          btn.onclick = () => { display.value = ""; errEl.textContent = ""; };
        } else {
          btn.onclick = () => { display.value += k; errEl.textContent = ""; };
        }
        grid.appendChild(btn);
      }
    }

    window.addEventListener("message", (e) => {
      const msg = e.data;
      if (msg.type === "result") {
        display.value = String(msg.value);
        errEl.textContent = "";
      }
      if (msg.type === "error") {
        errEl.textContent = msg.message;
      }
    });
  </script>
</body>
</html>`;
}
class CalculatorPanelProvider {
    resolveWebviewView(webviewView) {
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = getHtml();
        webviewView.webview.onDidReceiveMessage((msg) => {
            if (msg.type !== "eval" || msg.expr === undefined)
                return;
            try {
                const value = (0, eval_1.evalExpr)(msg.expr);
                webviewView.webview.postMessage({ type: "result", value });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                webviewView.webview.postMessage({ type: "error", message });
            }
        });
    }
}
exports.CalculatorPanelProvider = CalculatorPanelProvider;
//# sourceMappingURL=panel.js.map