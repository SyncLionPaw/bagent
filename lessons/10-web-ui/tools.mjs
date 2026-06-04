// 需 export TAVILY_API_KEY — 申请：https://docs.tavily.com/welcome

export const tools = [
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

async function tavilySearch(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    return "未配置 TAVILY_API_KEY。到 https://app.tavily.com 注册，文档见 https://docs.tavily.com/welcome";
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
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  if (!res.ok) return `Tavily 错误：${data.detail?.error ?? JSON.stringify(data)}`;

  const results = data.results ?? [];
  if (!results.length) return `未找到「${query}」相关结果。`;

  return results
    .map((r, i) => `${i + 1}. ${r.title}\n${r.content}`)
    .join("\n\n");
}

export async function runTool(call) {
  const { name, arguments: args } = call.function;

  if (name === "web_search") {
    const { query } = JSON.parse(args);
    try {
      return await tavilySearch(query);
    } catch (err) {
      return `搜索失败：${err.cause?.code ?? err.message}`;
    }
  }

  if (name === "get_time") {
    return new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  }

  if (name === "calculate") {
    const { expression } = JSON.parse(args);
    const s = expression.replace(/\s/g, "");
    if (!/^[\d+\-*/().]+$/.test(s)) return "仅支持数字与 +-*/()";
    return String(Function(`"use strict";return (${s})`)());
  }

  return `未知工具: ${name}`;
}
