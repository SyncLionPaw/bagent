# 怎么学

## 路线概览

```text
第一阶段  1–10    终端 / 网页 Agent（JavaScript .mjs）
第二阶段  11–21   API、推理、SSE 流式
第三阶段  22–38   TypeScript Agent 内核 · IDE 插件 · 产品全景
第四部分  39+     ACP 等行业协议 · 内核与壳的动手实现（连载）
扩展阅读  17      SSE 背景
扩展阅读  101–102 VS Code 插件入门 · 计算器 demo
```

## 学习建议

- **一次只学一章**，在 `lessons/` 对应目录跑 `npm run chNN`（或课文里的命令）  
- **不要只读文档**：代码和文档同步；改课文后 `npm run sync-docs` 更新本站  
- **环境**：Node 20+；第 1 课起需要 `DEEPSEEK_API_KEY`；插件课（30–33）需要 [VS Code](https://code.visualstudio.com/) 或 Cursor  

## 按阶段入口

| 你想… | 从哪开始 |
|--------|----------|
| 零基础 | [环境准备](./environment) → [第 1 课](../chapters/01-deepseek) |
| 已有对话机器人，想学 Agent 工程 | [第 22 课 TypeScript](../chapters/22-typescript) → [第 24 课 Loop](../chapters/24-agent-loop) |
| 学流式与双进程 | [第 25 课](../chapters/25-agent-stream) → [第 28 课](../chapters/28-agent-network) |
| 做 VS Code 插件 | [第 101 课](../chapters/101-vscode-extension) → [第 102 课 demo](../chapters/102-vscode-calculator) → [第 30 课](../chapters/30-vscode-extension) |
| 理解内核升级（Thinking / 审批） | [第 34–36 课](../chapters/34-agent-thinking) |
| 看产品全景 | [第 38 课](../chapters/38-agent-product) · [第 39 课 ACP](../chapters/39-agent-client-protocol) |

## 扩展阅读

纯阅读、无当堂 `npm run` 的章节，按需跳读：

- [第 17 课 · SSE 行业背景](../chapters/17-sse-landscape)  
- [第 27 课 · Agent 架构](../chapters/27-agent-architecture)  
- [第 29 课 · 拆开的好处](../chapters/29-agent-split)  
- [第 37 课 · 两个循环](../chapters/37-two-loops)  
- [第 101–102 课 · VS Code 插件](../chapters/101-vscode-extension)  

[环境准备 →](./environment) · [第 0 章 前言 →](../chapters/00-preface)
