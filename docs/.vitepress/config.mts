import { defineConfig } from "vitepress";

const github = "https://github.com/SyncLionPaw/bagent";
const base = "/bagent/";

export default defineConfig({
  lang: "zh-Hans",
  title: "bagent",
  description: "用 JavaScript 循序渐进学会大模型 Agent",
  base,
  head: [
    ["link", { rel: "icon", href: `${base}favicon.ico`, sizes: "any" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: `${base}favicon-32.png` }],
    ["link", { rel: "icon", type: "image/png", sizes: "128x128", href: `${base}logo-icon.png` }],
    ["link", { rel: "apple-touch-icon", sizes: "180x180", href: `${base}apple-touch-icon.png` }],
  ],
  ignoreDeadLinks: [/(?:^|\/)README/, /\.\.\//, /\.py$/],
  themeConfig: {
    logo: { src: "/logo-icon.png", alt: "bagent" },
    socialLinks: [{ icon: "github", link: github }],
    search: { provider: "local" },
    editLink: {
      pattern: `${github}/edit/main/docs/:path`,
      text: "在 GitHub 上编辑此页",
    },
    footer: {
      message: "JavaScript 课程 · 循序渐进学会大模型 Agent",
      copyright: "Copyright © bagent contributors",
    },
    nav: [
      { text: "怎么学", link: "/guide/how-to-learn", activeMatch: "/guide/" },
      { text: "第 1 课", link: "/chapters/01-deepseek", activeMatch: "/chapters/01" },
    ],
    sidebar: [
      {
        text: "从这里开始",
        items: [
          { text: "简介", link: "/" },
          { text: "怎么学", link: "/guide/how-to-learn" },
          { text: "环境准备", link: "/guide/environment" },
        ],
      },
      {
        text: "第一阶段 · 写 Agent（1–10）",
        collapsed: false,
        items: [
          { text: "第 0 章 — 前言", link: "/chapters/00-preface" },
          { text: "第 1 课 — DeepSeek API", link: "/chapters/01-deepseek" },
          { text: "第 2 课 — 终端一问一答", link: "/chapters/02-terminal-chat" },
          { text: "第 3 课 — 循环提问", link: "/chapters/03-chat-loop" },
          { text: "第 4 课 — 多轮对话", link: "/chapters/04-multi-round" },
          { text: "第 5 课 — 系统提示词", link: "/chapters/05-system-prompt" },
          { text: "第 6 课 — 封装函数", link: "/chapters/06-functions" },
          { text: "第 7 课 — Tool Calls", link: "/chapters/07-tool-calls" },
          { text: "第 8 课 — 第一个 Agent 🎉", link: "/chapters/08-qa-agent" },
          { text: "第 9 课 — Tavily 搜索", link: "/chapters/09-tavily" },
          { text: "第 10 课 — 网页 Agent 🎉", link: "/chapters/10-web-ui" },
        ],
      },
      {
        text: "第二阶段 · API 与推理（11–13）",
        collapsed: false,
        items: [
          { text: "第 11 课 — API 响应字段", link: "/chapters/11-inference" },
          { text: "第 12 课 — 本地推理体验", link: "/chapters/12-local-inference" },
          { text: "第 13 课 — 推理框架导读", link: "/chapters/13-inference-engines" },
        ],
      },
      {
        text: "第二阶段 · 流式（14–21）",
        collapsed: false,
        items: [
          { text: "第 14 课 — FastAPI 假数据流式", link: "/chapters/14-fastapi-stream" },
          { text: "第 15 课 — SSE 解析对照", link: "/chapters/15-sse-parse" },
          { text: "第 18 课 — 浏览器 SSE 打字机", link: "/chapters/18-streaming" },
          { text: "第 19 课 — 浏览器流式气泡", link: "/chapters/19-web-stream" },
          { text: "第 20 课 — Node 藏 Key 网关", link: "/chapters/20-web-stream-server" },
          { text: "第 21 课 — 浏览器与 Node", link: "/chapters/21-js-runtimes" },
        ],
      },
      {
        text: "第三阶段 · 代码智能体",
        collapsed: false,
        items: [
          { text: "第 22 课 — TypeScript 入门", link: "/chapters/22-typescript" },
          { text: "第 23 课 — messages 设计", link: "/chapters/23-agent-messages" },
          { text: "第 24 课 — Agent Loop", link: "/chapters/24-agent-loop" },
          { text: "第 25 课 — 流式 Agent", link: "/chapters/25-agent-stream" },
          { text: "第 26 课 — 流式事件", link: "/chapters/26-agent-events" },
          { text: "第 27 课 — Agent 架构常识", link: "/chapters/27-agent-architecture" },
          { text: "第 28 课 — 双进程事件", link: "/chapters/28-agent-network" },
          { text: "第 29 课 — 拆开的好处", link: "/chapters/29-agent-split" },
          { text: "第 30 课 — VS Code 插件", link: "/chapters/30-vscode-extension" },
          { text: "第 31 课 — spawn 子进程", link: "/chapters/31-vscode-spawn" },
          { text: "第 32 课 — 右侧辅助栏", link: "/chapters/32-vscode-auxiliarybar" },
          { text: "第 33 课 — 打包 VSIX", link: "/chapters/33-vscode-vsix" },
          { text: "第 34 课 — Thinking 事件", link: "/chapters/34-agent-thinking" },
          { text: "第 35 课 — 工具审批", link: "/chapters/35-tool-approval" },
          { text: "第 36 课 — 工具钩子", link: "/chapters/36-tool-hooks" },
          { text: "第 37 课 — 两个循环", link: "/chapters/37-two-loops" },
          { text: "第 38 课 — 三种产品形态", link: "/chapters/38-agent-product" },
          { text: "第 39 课 — ACP", link: "/chapters/39-agent-client-protocol" },
        ],
      },
      {
        text: "扩展阅读",
        collapsed: true,
        items: [
          { text: "第 17 课 — SSE 行业背景", link: "/chapters/17-sse-landscape" },
        ],
      },
      {
        text: "其他",
        items: [{ text: "维护文档站", link: "/development" }],
      },
    ],
  },
});
