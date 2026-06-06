# 第 17 课 · SSE 的真实缺陷与行业现状（调研向）

**约 20 分钟** · 纯阅读 · [第 18 课](/chapters/18-streaming) 之后

第 14–16 课教的是 **怎么发、怎么解析 SSE**。  
这一课回答更尖锐的两个问题：

1. **SSE 到底有哪些真缺陷？**（不是过时谣言）  
2. **2025–2026 年，大家还在用 SSE 吗，还是已经换了别的？**

结论先写在前面，避免误读：

> **主流「大模型 HTTP 流式补全」仍以 SSE（或 SSE 形态的 HTTP 流）为主**——DeepSeek、Anthropic、OpenAI 的默认 streaming 都是这条路。  
> **没有发生全行业「弃用 SSE」**；发生的是 **分层**：浏览器推 token 仍多为 SSE；**多轮 Agent、超低延迟编排** 开始 **额外** 上 WebSocket；**服务间** 用 gRPC 等。

---

## 1. 先界定：你说的「SSE」是哪一层

| 层 | 本课指什么 |
|----|------------|
| **协议** | HTTP 响应 `Content-Type: text/event-stream`，`data:` 行 + 空行 |
| **浏览器 API** | `EventSource`（只能 GET）——**很多教程把它和协议混为一谈** |
| **LLM 产品形态** | `stream: true` → 一连串 `data: {json}` → `[DONE]` |

第 18 课用的是 **`fetch` + `getReader()` 解析 SSE 文本**（浏览器里 `public/index.html`），不是 `EventSource`。  
下面说的「还在用 SSE」，指 **协议层**；不是指你必须用 `EventSource`。

---

## 2. 主流 API 现在到底用什么（可查文档）

截至 **2026 年初**，各家 **默认的「流式聊天补全」** 如下：

| 厂商 / 产品 | 默认流式传输 | 文档依据 |
|-------------|--------------|----------|
| **DeepSeek** | `stream: true` → **SSE**，`data: [DONE]` | [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion) |
| **Anthropic** | `stream: true` → **SSE**，且带 **命名事件**（`event: message_start` 等） | [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) |
| **OpenAI** | Responses / Chat：**HTTP `stream=true` → SSE**（`response.output_text.delta` 等） | [Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses) |
| **OpenAI（新增）** | Responses API 另有 **WebSocket 模式**，面向 **多轮 Agent、tool 链** | [WebSocket Mode](https://developers.openai.com/api/docs/guides/websocket-mode) |
| **自建推理**（vLLM / TGI 等） | 常见 **OpenAI 兼容 SSE 端点** | 第 13 课导读 |

也就是说：

- **「问一句、答一句、边生成边推 token」**：行业默认仍是 **SSE 形态**。  
- **「同一连接上连续很多轮 Agent + 工具」**：OpenAI 等开始推 **WebSocket**，是 **增量选项**，不是把 SSE 整体作废。

Anthropic 的 SSE 比 OpenAI Chat Completions **更啰嗦**（有 `event:` 行、多种 `*_delta`），但 **仍是 SSE**，不是 WebSocket。

---

## 3. SSE 的真实缺陷（值得正经写进架构评审）

### 3.1 协议与模型能力

| 缺陷 | 含义 |
|------|------|
| **单向** | 只能服务器 → 客户端。生成过程中若要 **频繁上行**（打断、改向、批准工具），纯 SSE 不够，要第二条 HTTP 或换 WebSocket。 |
| **文本为主** | 规范路径是 UTF-8 文本事件；二进制要 Base64 或换协议。 |
| **无统一背压语义** | 浏览器 `fetch` 读流时，应用层要自己处理「消费太慢」；不像 gRPC 那样在协议里谈 flow control。 |

### 3.2 运维与网关（真踩坑）

| 缺陷 | 含义 |
|------|------|
| **反向代理缓冲** | Nginx 默认 `proxy_buffering on` 会把你的「流」攒成一块才下发；必须 `proxy_buffering off` 或响应头 `X-Accel-Buffering: no`。 |
| **CDN / LB 空闲断开** | AWS ALB 等对空闲连接有超时；流式若很久没字节，要被 **心跳**（如 SSE 注释行 `: ping`）顶住。 |
| **框架层缓冲** | FastAPI / Express 等默认也可能缓冲，需 `flush` 或 `StreamingResponse` 正确配置（第 14 课）。 |
| **可观测性** | 长连接占着 worker / 线程；高并发时要和 Web 短请求分开调容量。 |

这些不是「SSE 理论过时」，而是 **不做就会以为流式坏了** 的工程问题。

### 3.3 浏览器侧的历史包袱

| 说法 | 2026 年更精确的理解 |
|------|---------------------|
| 「每个域名只能 6 条 SSE」 | **HTTP/1.1** 时代的浏览器限制；**HTTP/2/3 多路复用** 后，同一域名多条 SSE 压力小很多（仍要看服务器与代理）。 |
| 「必须用 EventSource」 | **错**。Chat API 要 **POST + JSON**，只能用 **`fetch` + 流式读 body**（第 15–16 课）。 |
| 「企业防火墙封杀 SSE」 | **偶发**；相对 WebSocket，SSE 走普通 HTTP 往往 **更容易过**。WebSocket 在部分企业网里反而更敏感。 |

### 3.4 与「另一条路」比，SSE 输在哪

| 场景 | 更合适的选择 |
|------|----------------|
| 浏览器 **只收 token** | **SSE**（简单、与 OpenAI 形态一致） |
| 生成中 **客户端要经常上行**（打断、协作 Agent） | **WebSocket** 或 **额外 HTTP 控制请求** |
| **微服务 ↔ 推理引擎** | **gRPC streaming**（类型、性能、背压） |
| 语音实时 | **WebRTC / 厂商 Realtime WebSocket** |
| 纯后端批处理 | 往往 **不流式**，一次 JSON 更简单 |

---

## 4. 「热度降了」到底是什么意思

### 4.1 没有发生的事

- ❌ 主流 Chat Completions **集体改成** WebSocket 推 token  
- ❌ DeepSeek / Anthropic **废弃** `text/event-stream`  
- ❌ 前端普遍改用 **WebTransport** 接 LLM（仍太早）

### 4.2 确实发生的事

**（1）SSE 从「热搜词」变成「默认管道」**  
SDK 一行 `stream: true`，没人再写博客《震惊，SSE 是什么》。讨论转向 Agent、推理成本、工具编排。

**（2）多了一层：WebSocket 服务「长链 Agent」**  
OpenAI 明确写：HTTP streaming 用 SSE；**WebSocket 模式**给 `previous_response_id` 多轮、tool-heavy 工作流降延迟（[官方说明](https://developers.openai.com/api/docs/guides/streaming-responses) 与 [WebSocket 指南](https://developers.openai.com/api/docs/guides/websocket-mode)）。  
这是 **新增赛道**，不是替换「打字机 SSE」。

**（3）服务间不用 SSE**  
编排服务 → vLLM 往往 **gRPC / 内网 HTTP**，和浏览器看到的 SSE 无关。

**（4）「Realtime / 语音」走另一条产品线**  
OpenAI Realtime、各厂语音对话，多是 **WebSocket/WebRTC**——和文本 Chat Completions 的 SSE **并列**，不是替代关系。

**（5）解析被库吃掉**  
`eventsource-parser`、官方 SDK 的 `for await (chunk of stream)` 让你 **少手写 `data:`**，舆论里「SSE」字样变少，**线上字节仍是 SSE 形态**。

---

## 5. 一张「该用什么」的决策表（2026 实用版）

```text
用户浏览器 / Node 客户端
  只关心「字一个个出来」、兼容 OpenAI API
    → SSE（stream: true + 解析 data:）  ← 本课程主线，仍是默认解

  同一连接多轮 Agent、工具往返极密、要低延迟续跑
    → 看厂商是否提供 WebSocket（如 OpenAI Responses WS）
    → 或 SSE + 多次 HTTP 补请求（多数项目仍这样）

Kubernetes 里服务 A 调服务 B 的推理
    → gRPC streaming / 内网 OpenAI-compatible HTTP

语音、视频、强双向
    → WebRTC / 厂商 Realtime WS
```

---

## 6. Agent 与宿主的 IPC：JSON-RPC 2.0，但和 SSE 不是一层

一些 **CLI Agent**（终端里的代码助手）除了调模型，还要和 **IDE、自研 UI、自动化脚本** 对话。那条线常用 **JSON-RPC 2.0 over stdio**（一行一条 JSON），和第 11 课的 JSON-RPC 信封、第 18 课的 **DeepSeek SSE** 是 **不同的层**。不要混成「某个产品用 JSON-RPC 代替了 SSE」。

> **记一句**：Agent IPC 是 **Agent 与 UI（宿主程序）之间** 的协议，**不是** Agent 与 **LLM 厂商** 之间的协议。  
> 对模型仍走 HTTP 流式（常见 SSE）；IPC 上的「正文片段」类事件是 Agent **整理后推给 UI** 的，不是云端 API 的原始 chunk。

```text
UI / IDE / SDK  ──JSON-RPC（stdio）──►  Agent 进程  ──HTTP+SSE──►  LLM Provider
     ↑ 第 17 课本节                         ↑ 工具/MCP/多轮           ↑ 第 18 课
```

### 6.1 三层别搞混

```text
┌─────────────────────────────────────────────────────────┐
│  你的 IDE / 自研 UI / 测试脚本                            │
│       ↕  JSON-RPC 2.0，stdin/stdout，一行一条 JSON       │
├─────────────────────────────────────────────────────────┤
│  Agent 进程（工具、MCP、多轮编排）                        │
│       ↕  内部仍要调大模型 HTTP API（常见仍是 stream + SSE） │
├─────────────────────────────────────────────────────────┤
│  DeepSeek / 其他厂商 云端推理                             │
└─────────────────────────────────────────────────────────┘
```

| 层 | 协议 | 干什么 |
|----|------|--------|
| **Agent IPC** | **JSON-RPC 2.0** over **stdio** | **宿主程序 ↔ Agent 进程**，不是浏览器直连模型 |
| **Chat Completions**（第 18 课） | **HTTP + SSE** | **Agent 内核 ↔ 云端模型** 推 token |
| **ACP** | 也是 **JSON-RPC 2.0** over stdio，走 [Agent Client Protocol](https://agentclientprotocol.com/) | **编辑器 ↔ Agent**（如 Zed），报文与自建 IPC 不同 |

### 6.2 IPC 在干什么（和 SSE 的对比）

Agent 以「管道模式」启动时，**一行一个 JSON**（JSONL），走 **stdin/stdout**，符合 JSON-RPC 2.0：

- **Request / Response**：有 `id`，例如 `initialize`、`prompt`——客户端发指令，Agent 回 `result`。  
- **Notification**：无 `id`，例如 **`method: "event"`**——Agent **主动推**进度，客户端不用回包。

「流式打字机」在 IPC 里 **不是** `data: {...}\n\n` 的 SSE，而是 **一连串 JSON-RPC 通知**：

```json
{"jsonrpc":"2.0","method":"event","params":{"type":"ContentPart","payload":{"text":"你"}}}
{"jsonrpc":"2.0","method":"event","params":{"type":"ContentPart","payload":{"text":"好"}}}
{"jsonrpc":"2.0","method":"event","params":{"type":"ToolCallPart","payload":{"arguments_part":"..."}}}
```

常见 `event` 类型包括 `TurnBegin`、正文片段、工具参数片段、`ToolResult`、`StatusUpdate`（token 用量）等——与 [第 26 课](/chapters/26-agent-events) 要自建的事件思路相近。

还有 **`method: "request"`**（带 `id`）：Agent **向你的客户端要答复**，例如工具审批 `ApprovalRequest`；客户端必须回 JSON-RPC `result`，否则 Agent 会卡住。这是 **真·双向**，比 SSE 单向推字复杂一档。

### 6.3 和第 11 课 JSON-RPC 的异同

| | 第 11 课举例 | Agent IPC |
|--|-------------|-----------|
| 信封 | `jsonrpc` / `method` / `params` / `id` | ✅ 同样是 JSON-RPC 2.0 |
| 传输 | 常比喻为 **一次 HTTP 一个 JSON** | **长连接 stdio**，多轮、多条消息 |
| 流式 | 一般不讨论 | **`event` 通知** 流式推送 |
| 用途 | 理解「RPC 形状」 | **产品级 Agent IPC** |

所以：第 11 课说的 JSON-RPC **没有过时**；成熟 Agent 把它当成 **Agent 和外部程序之间的总线**，并且在 RPC 之上再套 `type + payload` 的**领域事件**。

### 6.4 和 SSE 是「分工」不是「替代」

- **Agent IPC（JSON-RPC）**：给 **IDE、SDK、自动化测试** 用——控制 Agent、收步骤事件、跑工具、回审批。  
- **SSE（HTTP）**：Agent **内部调模型** 时，仍走与 OpenAI 类似的 **HTTP streaming**（你在 IPC 外看不到，抓包云端仍是 `text/event-stream` 那一类）。

因此：

- 不是说「行业从 SSE 换成了 JSON-RPC」；  
- 而是 **「对外用 JSON-RPC 管 Agent；对内仍用 SSE 管模型」**——两层协议叠在一起。

### 6.5 还有一条线：ACP

**Agent Client Protocol**（编辑器生态里的约定），底层也是 **stdio + JSON-RPC 2.0**，方法与自建 IPC 不完全相同（如 `session/request_permission`）。  
Zed 等编辑器集成走的是这条。

若你只做 **网页 `fetch` 调 DeepSeek**（第 18 课），**不必先实现 Agent IPC**；若你做 **自研 Agent 控制台或 IDE 插件**，再考虑 JSON-RPC 事件层（第 26 课会动手定义事件类型）。

---

## 7. 对你课程路线的含义

| 你学的 | 在 2026 年是否过时 |
|--------|-------------------|
| 第 14 课 网关 `StreamingResponse` | ✅ 仍是正确抽象（真换模型也只是换上游字节来源） |
| 第 15 课 手写 vs `eventsource-parser` | ✅ 生产常用库；排错、读抓包仍要懂 `data:` |
| 第 18 课 DeepSeek SSE | ✅ 与官方文档一致，不是偏门 |
| 第 17 课（本课） | 分清 **SSE（对模型）** vs **JSON-RPC IPC（对 Agent 进程）** |

**不必焦虑「明天全网不用 SSE」**；要焦虑的是：

- 网关有没有 **真转发流**（第 14 课）  
- 代理有没有 **缓冲/超时**（3.2）  
- 做复杂 Agent 时要不要 **加 WebSocket 或控制通道**（3.1）

---

## 8. 常见误解对照

| 误解 | 更接近事实 |
|------|------------|
| 「SSE 已经没人用了」 | **HTTP LLM 流式仍以 SSE 为主**；少的是讨论量 |
| 「都应该换 WebSocket」 | WebSocket 适合 **双向/长链 Agent**；纯推 token 用 WS 常 **更重** |
| 「EventSource 不能用就是 SSE 废了」 | 废的是 **GET-only API**，不是协议；`fetch` 读流即可 |
| 「HTTP/2 之后 SSE 没缺点了」 | **代理缓冲、空闲断开、单向** 仍在 |
| 「OpenAI 上了 WebSocket = SSE 淘汰」 | 官方仍写 **HTTP streaming = SSE**；WS 是 **另一条模式** |
| 「Agent IPC = 全行业不用 SSE 了」 | IPC 是 **Agent↔宿主**；模型侧仍常用 **HTTP SSE** |

---

## 检查点

- [ ] 能列举 **2 个 SSE 真缺陷**（单向、代理缓冲）吗？  
- [ ] 能说出 **DeepSeek / Anthropic / OpenAI 默认流式仍是什么**吗？  
- [ ] 能区分 **「SSE 协议」** 和 **`EventSource` API** 吗？  
- [ ] 知道 **WebSocket 在业界的增量场景**（多轮 Agent）吗？  
- [ ] 能说出 **Agent IPC** 解决的是 **stdio 上双向 RPC**，不是替代 DeepSeek SSE 吗？  

## 下一课

第 18–19 课连载中。

## 参考（可自行延伸）

- [OpenAI — Streaming（SSE）](https://developers.openai.com/api/docs/guides/streaming-responses)  
- [OpenAI — WebSocket Mode](https://developers.openai.com/api/docs/guides/websocket-mode)  
- [Anthropic — Streaming（SSE）](https://platform.claude.com/docs/en/build-with-claude/streaming)  
- [DeepSeek — Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion)  
- [MDN — Server-sent events](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events)  
- [WHATWG — Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)  
- [Agent Client Protocol](https://agentclientprotocol.com/)

[← 第 18 课](/chapters/18-streaming)
