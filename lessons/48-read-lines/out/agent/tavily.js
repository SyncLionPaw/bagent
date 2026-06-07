"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEB_SEARCH_MAX_CHARS = void 0;
exports.hasWebSearch = hasWebSearch;
exports.tavilySearch = tavilySearch;
exports.WEB_SEARCH_MAX_CHARS = 8_000;
function hasWebSearch() {
    return Boolean(process.env.TAVILY_API_KEY?.trim());
}
async function tavilySearch(query) {
    const key = process.env.TAVILY_API_KEY?.trim();
    if (!key) {
        return JSON.stringify({
            error: "未配置 TAVILY_API_KEY",
            hint: "在 ~/.bagent/tavily-api-key 写入 tvly-...，或 export 环境变量。申请：https://app.tavily.com",
        });
    }
    const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            query,
            search_depth: "basic",
            max_results: 5,
        }),
        signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json());
    if (!res.ok) {
        return `Tavily 错误：${data.detail?.error ?? JSON.stringify(data)}`;
    }
    const results = data.results ?? [];
    if (!results.length)
        return `未找到「${query}」相关结果。`;
    return results.map((r, i) => `${i + 1}. ${r.title}\n${r.content}`).join("\n\n");
}
//# sourceMappingURL=tavily.js.map