"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDefinitions = void 0;
exports.runTool = runTool;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.toolDefinitions = [
    {
        type: "function",
        function: {
            name: "read_file",
            description: "读取当前工作区根目录下的文本文件",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "如 package.json" },
                },
                required: ["path"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "web_search",
            description: "联网搜索（Tavily）。用户说搜一下、查新闻、最近动态时使用。",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "搜索关键词" },
                },
                required: ["query"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_time",
            description: "获取当前日期时间（上海时区）。用户问现在几点、今天几号时使用。",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "calculate",
            description: "计算数学表达式。用户问算数、几步运算时使用。",
            parameters: {
                type: "object",
                properties: {
                    expression: {
                        type: "string",
                        description: "仅含数字与 +-*/() 的式子，如 (128+256)*3",
                    },
                },
                required: ["expression"],
            },
        },
    },
];
const allowedFiles = new Set(["package.json", "README.md"]);
async function tavilySearch(query) {
    const key = process.env.TAVILY_API_KEY?.trim();
    if (!key) {
        return "未配置 TAVILY_API_KEY。在 ~/.bagent/tavily-api-key 写入 tvly-...，或 export 环境变量。";
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
async function runTool(call) {
    const { name, arguments: args } = call.function;
    if (name === "read_file") {
        const { path: filePath } = JSON.parse(args);
        if (!allowedFiles.has(filePath)) {
            return JSON.stringify({ error: `本课只允许读: ${[...allowedFiles].join(", ")}` });
        }
        try {
            return (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(process.cwd(), filePath), "utf-8");
        }
        catch (err) {
            return JSON.stringify({ error: String(err) });
        }
    }
    if (name === "web_search") {
        const { query } = JSON.parse(args);
        try {
            return await tavilySearch(query);
        }
        catch (err) {
            const e = err;
            return `搜索失败：${e.cause?.code ?? e.message}`;
        }
    }
    if (name === "get_time") {
        return new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    }
    if (name === "calculate") {
        const { expression } = JSON.parse(args);
        const s = expression.replace(/\s/g, "");
        if (!/^[\d+\-*/().]+$/.test(s))
            return "仅支持数字与 +-*/()";
        return String(Function(`"use strict";return (${s})`)());
    }
    return `未知工具: ${name}`;
}
//# sourceMappingURL=tools.js.map