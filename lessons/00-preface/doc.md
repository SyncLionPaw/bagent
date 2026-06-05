# 第 0 章 — 前言

## 这门课是什么

**bagent** 是一门**用 JavaScript 学会大模型 Agent** 的循序渐进课程。

你会用 **Node.js** 写 `.mjs`，从「调一次大模型 API」开始，逐章补上对话、工具调用、记忆与编排，一步步拼出 Agent。每章只加一个概念，配一段能跑的代码。

这是**教程**，不是装好就能上生产的 npm 包。  
**课程连载中**：第 1–10 课为**第一阶段**；**第 11–21 课为第二阶段**（API、流式、运行时）；**第 22 课起为第三阶段**（造类似 Claude Code 的代码智能体，先定 messages 结构）。

## 技术栈约定

- **语言**：JavaScript（ESM，Node 20+）
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

## 目前已发布（第 1–21 课 + 连载）

侧栏与下文列表同步更新；**未写完的课不会提前挂链接**。

## 怎么开始

1. [怎么学](/guide/how-to-learn)  
2. [环境准备](/guide/environment)  
3. [第 1 课 · DeepSeek API](/chapters/01-deepseek)  
4. [第 2 课 · 终端一问一答](/chapters/02-terminal-chat)  
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
22. [第 22 课 · 代码智能体（第三阶段）](/chapters/22-agent-project)（连载中）  
23. [第 23 课 · Agent Loop + Tool Calls](/chapters/23-agent-tools)（连载中）  
24. [第 17 课 · SSE 行业背景](/chapters/17-sse-landscape)（扩展阅读）
