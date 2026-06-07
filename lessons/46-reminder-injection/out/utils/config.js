"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskApiKey = maskApiKey;
exports.formatConfig = formatConfig;
function maskApiKey(key) {
    const t = key.trim();
    if (t.length <= 8)
        return "****";
    return `${t.slice(0, 3)}…${t.slice(-4)}`;
}
function formatConfig(info) {
    const lines = [
        "当前配置",
        "",
        `模型：${info.model}`,
        `工作目录：${info.cwd}`,
        `API Key：${info.apiKeySource}`,
    ];
    if (info.apiKeyPath) {
        lines.push(`Key 文件：${info.apiKeyPath}`);
    }
    if (info.apiKeyPreview) {
        lines.push(`Key 预览：${info.apiKeyPreview}`);
    }
    lines.push("", `联网搜索 web_search：${info.webSearchEnabled ? "已启用（Tavily）" : "未配置"}`);
    if (info.webSearchEnabled && info.tavilySource) {
        lines.push(`Tavily Key：${info.tavilySource}`);
    }
    if (!info.webSearchEnabled && info.tavilyApiKeyPath) {
        lines.push(`Tavily 文件：${info.tavilyApiKeyPath}`);
    }
    lines.push("", "修改模型：/model <id>");
    return lines.join("\n");
}
//# sourceMappingURL=config.js.map