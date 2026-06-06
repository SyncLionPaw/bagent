# 第 26 课 · Agent 流式事件

**约 30 分钟** · [第 25 课](/chapters/25-agent-stream) 之后

第 25 课在 `onToken` 里直接 `stdout.write`。本课把 **Agent 内核** 和 **UI** 拆开：Loop 只 **产出事件**，你怎么显示由消费方决定。

---

## 1. 同进程里怎么「emit」和「消费」

推荐写法：**`async generator`（异步生成器）**——在 TypeScript 里用 `yield` 代替 `emit`，用 `for await` 消费。

```typescript
// loop.ts — 生产者
async *turn(userInput: string): AsyncGenerator<AgentEvent> {
  yield { type: "TurnStart", userInput };
  // ...
  yield { type: "ChunkUpdated", text: "你" };
  yield { type: "TurnEnd", text: "你好" };
}

// chat.ts — 消费者
for await (const event of agent.turn(user)) {
  handleTerminalEvent(event, uiState);
}
```

| 角色 | 文件 | 职责 |
|------|------|------|
| 事件类型 | `events.ts` | `AgentEvent` 联合类型 |
| 生产者 | `loop.ts` + `stream.ts` | `yield` 事件，维护 `history` |
| 消费者 | `terminal.ts`（可换） | `switch (event.type)` 决定怎么画 |
| 入口 | `chat.ts` | `for await` 把两者接起来 |

**仍在同一个进程、同一个事件循环里**：`for await` 每收到一个 `yield`，就同步跑完你的 `handleTerminalEvent`，然后才继续读下一个 SSE 包。

---

## 2. 事件一览

```typescript
export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolResult"; name: string; output: string }
  | { type: "TurnEnd"; text: string };
```

| 事件 | 何时 yield |
|------|------------|
| `TurnStart` | 用户一句刚进 `turn()` |
| `ChunkUpdated` | SSE 里每个 `delta.content` |
| `ToolCallStart` | 准备 `runTool` 之前 |
| `ToolResult` | `runTool` 返回之后 |
| `TurnEnd` | 本轮最终文字已写入 history |

`ThinkingStart` 等可在此表上扩展；本课 API 关了 thinking，先不产出。

---

## 3. 嵌套 generator：`streamEvents`

流式解析也在 generator 里 `yield ChunkUpdated`，结束时 **return** 完整 `AssistantMessage`：

```typescript
const stream = streamEvents(this.history);
let step = await stream.next();
while (!step.done) {
  yield step.value;           // 转发 ChunkUpdated 给外层消费者
  step = await stream.next();
}
const assistant = step.value; // done 时的 return 值
```

这样 **SSE 细节** 留在 `stream.ts`，`loop.ts` 只关心领域事件。

---

## 4. 你自己怎么消费

### 方式 A：`for await` + `switch`（本课默认）

见 [`terminal.ts`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/26-agent-events/terminal.ts)：

```typescript
export function handleTerminalEvent(event: AgentEvent, state: { aiOpen: boolean }): void {
  switch (event.type) {
    case "ChunkUpdated":
      process.stdout.write(event.text);
      break;
    case "ToolCallStart":
      console.log(`[工具] ${event.name}(...)`);
      break;
    // ...
  }
}
```

换 **网页 UI**：新建 `web.ts`，同样 `switch`，改成改 DOM 即可；**不必改** `loop.ts`。

### 方式 B：回调

```typescript
agent.turn(user, (event) => { ... });
```

适合简单脚本；事件多时 generator 更清晰。

### 方式 C：`EventEmitter`

```typescript
agent.on("ChunkUpdated", (text) => { ... });
```

Node 传统写法；多个订阅者时好用。本课为少概念，用 generator。

---

## 5. 与第 25 课对照

| 第 25 课 | 第 26 课 |
|----------|----------|
| `onToken` → `write` | `yield ChunkUpdated` → 消费方 `write` |
| UI 焊在 `loop.ts` | UI 在 `terminal.ts` |
| 难以换界面 | 同一 `turn()` 可接终端 / 测试 / 录制 |

---

## 6. 目录与动手

```text
lessons/26-agent-events/
  events.ts
  stream.ts
  loop.ts
  terminal.ts    ← 消费者示例
  chat.ts
  messages.ts
  tools.ts
  color.ts
```

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch26
```

行为应接近 `ch25`；差别在代码结构——**打印逻辑全在 `terminal.ts`**。

---

## 检查点

- [ ] 能写出 `for await (const e of agent.turn(x))` 吗？  
- [ ] 能解释 `yield` 与 `emit` 的对应关系吗？  
- [ ] 能说明换 UI 时改哪个文件、不改哪个文件吗？

---

## 下一课

[第 28 课 · 双进程网络发布/订阅](/chapters/28-agent-network) — 事件经 SSE 跨进程传递。架构背景见 [第 27 课](/chapters/27-agent-architecture)。

[← 第 25 课](/chapters/25-agent-stream)
