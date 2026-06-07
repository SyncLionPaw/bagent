# 第 0 章 — 前言

## 这门课是什么

**bagent** 是一门**用 JavaScript 学会大模型 Agent** 的循序渐进课程。

你会用 **Node.js** 写 `.mjs`，从「调一次大模型 API」开始，逐章补上对话、工具调用、记忆与编排，一步步拼出 Agent。每章只加一个概念，配一段能跑的代码。

第三阶段后半（[第 38 课](/chapters/38-agent-product) 起）会讲：学完内核之后，**同一种 Agent 可以长出三种用法**——都共用 [第 36 课](/chapters/36-tool-hooks) 的 loop / 事件 / 钩子：

1. **终端 CLI** — TUI 分屏（消息区 + 输入区）  
2. **IDE 插件** — Webview + worker（[第 30–33 课](/chapters/30-vscode-extension) 已入门）  
3. **自有 UI** — 订阅本机 Agent 服务（[第 28 课](/chapters/28-agent-network) 的 SSE 范式），界面由**你**的前端来画  

**课程结构**：第 1–10 课 **第一阶段**；第 11–21 课 **第二阶段**；第 22–38 课 **第三阶段**；**第 39 课起第四部分**（行业协议 ACP、内核抽包、三种壳的动手实现）。

## 技术栈约定

- **语言**：第 1–21 课 JavaScript（`.mjs`）；**第 22 课起** TypeScript 入门后，第三阶段 Agent 用 `.ts`（`tsx` 运行）
- **HTTP**：原生 `fetch`
- **模型**：先接 DeepSeek 等兼容 API；本地模型、框架封装放在后面章节

## 我们不做什么

- 不用 Python 带你走一遍（除非你私下对照，课程正文以 JS 为准）
- 第一天不做 Cursor / IDE 那种完整编程 Agent
- 不一开始堆 RAG、LlamaIndex 全家桶 —— 会按章节慢慢加

## 每章放在哪

```text
lessons/NN-xxx/
  doc.md      # 课文
  *.mjs       # 当堂示例
```

`npm run build` 时会把课文同步到本站 `docs/chapters/`。

## 目前已发布

侧栏与下文列表同步；**未写完的课不会提前挂链接**。

| 阶段 | 课次 | 说明 |
|------|------|------|
| 第一阶段 | 1–10 | 终端与网页 Agent |
| 第二阶段 | 11–21 | 推理与流式（[第 17 课](/chapters/17-sse-landscape) 扩展阅读） |
| 第三阶段 | 22–38 | Agent 内核、IDE 插件、产品全景 |
| 第四部分 | 39+ | [ACP](/chapters/39-agent-client-protocol)（阅读）；动手实现连载中 |
| 扩展阅读 | 101–102 | [VS Code 插件入门](/chapters/101-vscode-extension)、[计算器 demo](/chapters/102-vscode-calculator) |

## 怎么开始

1. [怎么学](/guide/how-to-learn)  
2. [环境准备](/guide/environment)  
3. [第 1 课 · DeepSeek API](/chapters/01-deepseek)  

## 完整课表

1. [第 1 课 · DeepSeek API](/chapters/01-deepseek)  
2. [第 2 课 · 终端一问一答](/chapters/02-terminal-chat)  
5. [第 3 课 · 循环提问](/chapters/03-chat-loop)  
6. [第 4 课 · 多轮对话](/chapters/04-multi-round)  
7. [第 5 课 · 系统提示词](/chapters/05-system-prompt)  
8. [第 6 课 · 封装函数](/chapters/06-functions)  
9. [第 7 课 · Tool Calls](/chapters/07-tool-calls)  
10. [第 8 课 · 里程碑：第一个问答 Agent](/chapters/08-qa-agent)（检查点，建议多玩几句）  
11. [第 9 课 · Tavily 联网搜索](/chapters/09-tavily)  
12. [第 10 课 · 网页 Agent（第一阶段完结）](/chapters/10-web-ui)  
13. [第 11 课 · 响应里除了答案还有什么](/chapters/11-inference)（第二阶段开篇）  
14. [第 12 课 · 本地极小模型（transformers）](/chapters/12-local-inference)  
15. [第 13 课 · vLLM / SGLang 导读](/chapters/13-inference-engines)（扩展阅读）  
16. [第 14 课 · FastAPI 假数据流式](/chapters/14-fastapi-stream)  
17. [第 15 课 · SSE 解析（手写 vs 库）](/chapters/15-sse-parse)  
18. [第 18 课 · SSE 协议与浏览器打字机](/chapters/18-streaming)  
19. [第 19 课 · 浏览器流式解析](/chapters/19-web-stream)  
20. [第 20 课 · Node 网页流式网关](/chapters/20-web-stream-server)  
21. [第 21 课 · 浏览器与 Node.js（扩展阅读）](/chapters/21-js-runtimes)  
22. [第 22 课 · TypeScript 入门](/chapters/22-typescript)（第三阶段开篇）  
23. [第 23 课 · messages 设计](/chapters/23-agent-messages)  
24. [第 24 课 · Agent Loop](/chapters/24-agent-loop)  
25. [第 25 课 · 流式 Agent](/chapters/25-agent-stream)  
26. [第 26 课 · 流式事件](/chapters/26-agent-events)  
27. [第 27 课 · Agent 架构常识](/chapters/27-agent-architecture)（扩展阅读）  
28. [第 28 课 · 双进程事件](/chapters/28-agent-network)  
29. [第 29 课 · 拆开的好处](/chapters/29-agent-split)（扩展阅读）  
30. [第 30 课 · VS Code 插件](/chapters/30-vscode-extension)  
31. [第 31 课 · spawn Agent 子进程](/chapters/31-vscode-spawn)  
32. [第 32 课 · 右侧辅助栏](/chapters/32-vscode-auxiliarybar)  
33. [第 33 课 · 打包 VSIX](/chapters/33-vscode-vsix)  
34. [第 34 课 · Thinking 事件](/chapters/34-agent-thinking)  
35. [第 35 课 · 工具审批](/chapters/35-tool-approval)  
36. [第 36 课 · 工具钩子](/chapters/36-tool-hooks)  
37. [第 37 课 · 输入与 Agent 循环](/chapters/37-two-loops)（扩展阅读）  
38. [第 38 课 · CLI + 插件 + 自有 UI](/chapters/38-agent-product)（第三阶段收官）  
39. [第 39 课 · ACP（IDE 连 Agent）](/chapters/39-agent-client-protocol)（第四部分开篇）

**扩展阅读**：[第 17 课 · SSE 行业背景](/chapters/17-sse-landscape) · [第 101 课 · VS Code 插件入门](/chapters/101-vscode-extension) · [第 102 课 · 计算器插件](/chapters/102-vscode-calculator)
