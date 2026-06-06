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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const apiKey_1 = require("./apiKey");
const sidebar_1 = require("./sidebar");
const spawn_1 = require("./spawn");
let agent = null;
function activate(context) {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.extensionPath;
    const config = vscode.workspace.getConfiguration("bagent31");
    const deepseekPath = (0, apiKey_1.resolveApiKeyPath)(config.get("apiKeyPath", apiKey_1.DEFAULT_API_KEY_PATH), cwd);
    const tavilyPath = (0, apiKey_1.resolveApiKeyPath)(config.get("tavilyApiKeyPath", apiKey_1.DEFAULT_TAVILY_KEY_PATH), cwd);
    const apiKey = (0, apiKey_1.loadDeepSeekApiKey)(deepseekPath);
    if (!apiKey) {
        void vscode.window.showErrorMessage(`bagent: 未找到 DeepSeek API Key。请创建 ${deepseekPath}（单行 sk-...），或 export DEEPSEEK_API_KEY。`);
        return;
    }
    const tavilyKey = (0, apiKey_1.loadTavilyApiKey)(tavilyPath);
    if (!tavilyKey) {
        void vscode.window.showWarningMessage(`bagent: 未配置 Tavily Key（${tavilyPath}）。web_search 不可用；get_time / calculate / read_file 仍可用。`);
    }
    const agentEnv = { DEEPSEEK_API_KEY: apiKey };
    if (tavilyKey)
        agentEnv.TAVILY_API_KEY = tavilyKey;
    agent = new spawn_1.AgentProcess();
    agent.start(context.extensionPath, cwd, agentEnv);
    context.subscriptions.push({ dispose: () => agent?.shutdown() });
    const sidebar = new sidebar_1.ChatSidebarProvider(agent);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("bagent31.chat", sidebar), vscode.commands.registerCommand("bagent31.focus", () => {
        vscode.commands.executeCommand("bagent31.chat.focus");
    }));
}
function deactivate() {
    agent?.shutdown();
    agent = null;
}
//# sourceMappingURL=extension.js.map