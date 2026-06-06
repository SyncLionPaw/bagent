# 第 34 课 · Thinking 事件

**约 35 分钟** · [第 26 课](/chapters/26-agent-events) 之后 · Agent 内核升级

[第 26 课](/chapters/26-agent-events) 的 `AgentEvent` 只有正文流 `ChunkUpdated`，且 API 里 **`thinking: disabled`**。本课做两件事：

1. 请求里 **开启思考模式**（`reasoning_content`，见 [第 11 课](/chapters/11-inference)）  
2. 把推理过程拆成 **`ThinkingStart` / `ThinkingUpdated` / `ThinkingEnd`**，与正文 `ChunkUpdated` 分开  

插件侧（30–32 课）以后只要在 Webview 里多画一种气泡即可；本课先在 **终端** 验证事件。

```text
API delta.reasoning_content  →  ThinkingUpdated（灰字【思考】）
API delta.content            →  ChunkUpdated（青字 AI:）
```

---

## 1. 用起来什么样

`npm run ch34` 跑通后，终端里 **先灰字【思考】，再青色 AI 正文**：

![终端 Thinking 与 AI 回答](/lessons/34-agent-thinking/image.png)

- 启动提示：`Agent 思考事件 — thinking 开启`  
- **【思考】** 段：模型 `reasoning_content` 流式打出（脑筋急转弯会先推理再答）  
- **AI:** 段：最终 `content` 正文  
- 调工具时仍会出现 `[工具] read_file(...)`（本截图是纯问答轮次）  

---

## 2. 和第 26 课差在哪

| | 第 26 课 | 第 34 课（本课） |
|--|----------|------------------|
| API | `thinking: disabled` | **`thinking: enabled`** |
| 事件 | 6 种 | **9 种**（+3 思考） |
| `AssistantMessage` | 只有 `content` | 多 **`reasoning_content`**（有工具轮次时必须带回 history） |
| 终端 | 只打 AI 字 | 先灰字思考，再青色正文 |

---

## 3. 新增事件

```typescript
export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ThinkingStart" }
  | { type: "ThinkingUpdated"; text: string }
  | { type: "ThinkingEnd" }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolResult"; name: string; output: string }
  | { type: "TurnEnd"; text: string };
```

| 事件 | 何时 yield |
|------|------------|
| `ThinkingStart` | 收到第一个 `delta.reasoning_content` |
| `ThinkingUpdated` | 每个推理增量 |
| `ThinkingEnd` | 推理结束（接下来是 `content` 或 `tool_calls`） |
| `ChunkUpdated` | 与第 26 课相同 |

---

## 4. `stream.ts` 关键改动

```typescript
thinking: { type: "enabled" },
reasoning_effort: "high",

// delta 里多解析 reasoning_content
if (delta.reasoning_content) {
  yield { type: "ThinkingUpdated", text: delta.reasoning_content };
}
if (delta.content) {
  yield { type: "ThinkingEnd" };  // 若之前在思考
  yield { type: "ChunkUpdated", text: delta.content };
}
```

结束时 `return` 的 `AssistantMessage` 带上 `reasoning_content`，`loop` 原样 `push` 进 history——**有 tool_calls 时下一轮必须带回**（[第 11 课](/chapters/11-inference)）。

---

## 5. 目录

```text
lessons/34-agent-thinking/
  events.ts      # +Thinking*
  stream.ts      # thinking enabled + 解析 reasoning_content
  messages.ts    # AssistantMessage.reasoning_content
  terminal.ts    # 【思考】灰字 vs AI 青字
  loop.ts chat.ts tools.ts color.ts
```

本课目录 **自包含**，与 26 课互不 import。

---

## 6. 动手

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch34
```

试几句：

- `树上有 7 只小鸟，开枪打落一只，还剩几只？` — 见上文截图（【思考】→ 脑筋急转弯 → AI）  
- `apple 里有几个字母 o？` — 通常先【思考】再 AI 回答  
- `读一下 package.json 的 name` — 思考 → 可能调工具 → 正文  

---

## 7. 和插件课的关系

| 层 | 本课 | 30–32 课 |
|----|------|----------|
| 事件定义 | ✅ 已扩展 Thinking | 仍用旧 6 事件 |
| 工具审批 | ❌ 仍是 `ToolCallStart` 后立刻 `runTool` | ❌ 同样未做 |
| 下一步 | [第 35 课](/chapters/35-tool-approval) 补审批 | 把 `ThinkingUpdated` + 批准按钮画进 Webview |

内核升级 **不必** 先改插件；终端跑通事件后，再同步到 `31-vscode-spawn/agent/`。

---

## 8. 常见问题

| 现象 | 处理 |
|------|------|
| 没有【思考】只有 AI | 模型可能直接答了；换需要推理的题；确认 `thinking: enabled` |
| 工具后 400 | history 里 assistant 是否带 `reasoning_content` |
| 与 26 课事件不兼容 | 订阅端要处理新 type，旧 UI 可忽略 Thinking* |

---

## 检查点

- [ ] `reasoning_content` 和 `content` 在 API 里各是什么？  
- [ ] 为何 `ThinkingEnd` 要在第一个 `ChunkUpdated` 之前？  
- [ ] 有 `tool_calls` 时 history 为什么要存 `reasoning_content`？

---

[← 第 26 课](/chapters/26-agent-events) · [第 35 课](/chapters/35-tool-approval) · [第 11 课](/chapters/11-inference)
