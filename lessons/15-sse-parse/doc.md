# 第 15 课 · SSE 怎么解析：手写 vs 现成库（插播）

**约 20 分钟** · [第 14 课](/chapters/14-fastapi-stream) 之后 · 仍对接 **假数据** `ch14:server`，无需 API Key

## 第 14 课在干什么（回顾）

[`client.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/14-fastapi-stream/client.mjs) 里是 **手写 decode**：

```text
getReader() → TextDecoder → 字符串 buf → split("\n") → 找 data: 行 → JSON.parse
```

这是**故意的**：每一行都能对着 [SSE 协议](/chapters/16-streaming) 看明白。  
生产里很多人**不会逐字抄这段**，而是用库或 SDK 把「粘包、半行、多行 data」处理好。

本课做 **代码解读 + 两种实现对齐**，仍打 localhost:8014 假流。

---

## 手写解析在解决什么问题

TCP/HTTP 一次 `read()` 拿到的字节**不一定对齐「一行」**：

| 情况 | 例子 |
|------|------|
| 半行 | 先收到 `data: {"cho`，下一次才收到 `ices":...}\n` |
| 粘包 | 两行 `data:` 在同一次 read 里 |
| 空行 | SSE 用空行分隔事件，要保留在 buf 里等拼齐 |

所以要有 **`buf` 残留**：

```javascript
const lines = buf.split("\n");
buf = lines.pop() ?? "";  // 最后一行可能不完整，留到下次
```

再筛 `line.startsWith("data: ")`，跳过 `[DONE]`，解析 JSON，取 `delta.content`。

[`sse-hand.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/15-sse-parse/sse-hand.mjs) 把这段收成函数 `consumeSSE(res, onPiece)`，供对照阅读。

---

## 别人怎么实现：几条常见路线

| 方式 | 适用 | 说明 |
|------|------|------|
| **手写 buf + 行** | Node `fetch` + POST | 第 14、15 课；代码少时要自己处理边界 |
| **[`eventsource-parser`](https://github.com/rexxars/eventsource-parser)** | Node / 浏览器 fetch 流 | Vercel AI SDK 等底层常用；`parser.feed(chunk)` |
| **`EventSource`（浏览器内置）** | 仅 **GET** SSE | 不能带 POST body，**Chat Completions 一般不用它直连** |
| **OpenAI / 官方 SDK** | 应用层 | `for await (const chunk of stream)`，内部已解析 SSE |
| **Kimi Wire** | Agent↔宿主 IPC | JSON-RPC `event` 通知（`ContentPart` 等），不是 HTTP SSE |
| **`@microsoft/fetch-event-source`** | 浏览器 POST SSE | 补 EventSource 不能 POST 的缺口 |

大模型 **POST + stream** 场景：Node 里要么是 **手写**，要么是 **`eventsource-parser` 一类**；浏览器里常见 fetch + parser 或专用库。

---

## 本课代码：同一接口，两种实现

```javascript
// 两种文件都导出同一签名
export async function consumeSSE(res, onPiece) {
  // onPiece(piece) 每收到一小段正文调用一次
  return reply; // 完整拼接结果
}
```

| 文件 | 做法 |
|------|------|
| [`sse-hand.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/15-sse-parse/sse-hand.mjs) | 手写 `buf` / `split` / `data:` |
| [`sse-parser.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/15-sse-parse/sse-parser.mjs) | `createParser` + `parser.feed` |

库版核心：

```javascript
import { createParser } from "eventsource-parser";

const parser = createParser((event) => {
  if (event.data === "[DONE]") return;
  const chunk = JSON.parse(event.data);
  const piece = chunk.choices?.[0]?.delta?.content;
  if (piece) onPiece(piece);
});

while (read) parser.feed(decoder.decode(value, { stream: true }));
```

**你要读的差异**：手写你要维护 `buf`；库把 **event 边界** 封装掉了，你只处理 `event.data` 字符串。

---

## 运行（三个终端会话）

**终端 1**（若未开）：`npm run ch14:server`

**终端 2 — 手写：**

```bash
npm install    # 首次：装 eventsource-parser（仅 ch15:parser 需要）
npm run ch15:hand
```

**终端 3 — 库：**

```bash
npm run ch15:parser
```

同一句话跑两次，打字机效果应一致；实现文件不同。

---

## 浏览器 `EventSource`（了解即可）

```javascript
// 只能 GET，无法 POST messages —— 和大模型 Chat API 常见形态不匹配
const es = new EventSource("/some-get-stream");
es.onmessage = (e) => console.log(e.data);
```

文档：[MDN EventSource](https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource)  
第 10 课网页若要流式，更常见是 **`fetch` + getReader** 或 **eventsource-parser**，不是直接 `EventSource`。

---

## 和第 16 课的分工

| 课 | 内容 |
|----|------|
| 14 | FastAPI **发出**假 SSE |
| **15（本课）** | 客户端 **怎么解析** SSE（手写 vs 库） |
| 16 | SSE **协议理论** + Node **直连 DeepSeek** 真流 |

第 16 课 `ask.mjs` 会继续用手写或你可改成 `import { consumeSSE } from "../15-sse-parse/sse-parser.mjs"`——逻辑相同，只是 URL 换成真 API。

---

## 检查点

- [ ] 能说出为什么要 `buf = lines.pop()` 吗？  
- [ ] 知道 `EventSource` 为什么不适合 POST Chat API 吗？  
- [ ] 对照读过 `sse-hand.mjs` 与 `sse-parser.mjs` 吗？  
- [ ] 能说清「SDK 帮你解析」和本课手写的关系吗？  

## 下一课

[第 16 课 · SSE 协议与直连 DeepSeek](/chapters/16-streaming)

[← 第 14 课](/chapters/14-fastapi-stream) · [eventsource-parser](https://github.com/rexxars/eventsource-parser)
