# 第 25 课 · Agent Loop + 朴素流式输出

**约 25 分钟** · [第 24 课](/chapters/24-agent-loop) 之后

第 24 课用 `res.json()` **等整段回复**再打印。本课在 **同样的 Agent Loop** 上，把 `complete` 换成 **`stream: true` + SSE 解析**：`delta.content` 一到就 `stdout.write`，打字机效果。

**刻意不做**「事件类型」——没有 `ChunkUpdated`、`ThinkingStart` 等枚举；只有一个回调 `onToken(text)`。第 26 课再抽象成事件。

---

## 1. 与第 24 课差在哪

| | 第 24 课 | 第 25 课 |
|--|----------|----------|
| API | `stream` 省略（默认 false） | `stream: true` |
| 收包 | `await res.json()` | 读 `body` 流，解析 `data: {...}` |
| 打印 | 收齐后 `console.log` | `onToken` 里 `process.stdout.write` |
| Loop / tools | `AgentLoop` + `read_file` | **相同** |

内层「模型 → 工具 → 模型」、外层多轮、`history` 规则都不变。

---

## 2. 核心：`stream.ts`

[`stream.ts`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/25-agent-stream/stream.ts) 做三件事：

1. 发流式请求（仍带 `tools`）
2. 每收到 `delta.content` → 调用 `onToken(piece)` 并累加到 `content`
3. 流结束后拼出完整 `AssistantMessage`（含拼好的 `tool_calls`）供写入 `history`

SSE 解析与第 18 课相同：`buf` + `split("\n")` + `data: ` 行。

```typescript
export async function streamComplete(
  history: Messages,
  onToken: (text: string) => void,
): Promise<AssistantMessage> {
  // fetch(..., { stream: true })
  // 循环 reader.read() → 解析 delta.content → onToken
  // 顺带按 index 拼接 delta.tool_calls
  return { role: "assistant", content, tool_calls };
}
```

调工具时模型往往**没有**流式正文（只有 `tool_calls`），终端会先出现 `AI: ` 然后直接换行，接着黄的 `[工具]` 行——属正常。

---

## 3. `loop.ts` 怎么接

```typescript
process.stdout.write(color.ai("AI: "));
const raw = await streamComplete(this.history, (piece) => {
  process.stdout.write(color.ai(piece));
});
process.stdout.write("\n");
this.history.push(raw);
```

`chat.ts` **不再**在 `turn` 之后打印整段 `AI:`——流式已在 `turn` 里打完。

---

## 4. 目录

```text
lessons/25-agent-stream/
  messages.ts
  stream.ts     # 朴素流式（无事件类型）
  loop.ts
  tools.ts
  chat.ts
  color.ts
  doc.md
```

本章**不依赖**第 24 课目录，文件自包含。

---

## 5. 动手

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch25
```

对比 `npm run ch24`：同一句「介绍下自己」，25 应看到字**逐个蹦出来**。

---

## 6. 下一课预告

[第 26 课 · Agent 流式事件](/chapters/26-agent-events)（连载）——把「收到一块字」「开始思考」「工具开始」等收成 **`ChunkUpdated`、`ThinkingStart`** 等领域事件，UI 只订阅事件，不再直接绑 `onToken`。

---

## 检查点

- [ ] 能说出 `stream: true` 时为何用 `getReader()` 而不是 `json()` 吗？
- [ ] 能解释流式结束后为何仍要拼出完整 `AssistantMessage` 再 `push` 进 history 吗？
- [ ] 知道本课与第 26 课「事件化」的分界线吗？

---

[← 第 24 课](/chapters/24-agent-loop)
