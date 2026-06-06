# 第 35 课 · 工具审批

**约 40 分钟** · [第 34 课](/chapters/34-agent-thinking) 之后 · Agent 内核升级

---

## 0. 为什么需要工具审批？（我们现在还没有）

从 [第 24 课](/chapters/24-agent-loop) 到 [第 34 课](/chapters/34-agent-thinking)，模型一旦发出 `tool_calls`，`loop.ts` 里都是 **立刻 `runTool`**：

```typescript
yield { type: "ToolCallStart", ... };
const output = runTool(call);   // 没有停顿
yield { type: "ToolResult", ... };
```

这在 **学 Loop、跑通流式** 时够用。但产品里不行，原因是：

| 风险 | 例子 |
|------|------|
| **读敏感文件** | 模型要读 `.env`、SSH 私钥 |
| **写盘 / 删文件** | 将来加 `write_file`、`rm` 时更危险 |
| **外网请求** | `web_search` 可能泄露你粘贴的代码 |
| **用户不知情** | 终端一闪 `[工具] read_file(...)`，你没点过同意 |

[第 29 课](/chapters/29-agent-split) 已经画过 VS Code 插件：**侧边栏在 `ToolCallStart` 时弹「是否允许读某文件」→ 批准后 server 才执行**。  
[第 31–32 课](/chapters/31-vscode-spawn) 的插件子进程 **也还没做审批**——事件仍是旧协议，工具在 worker 里直接跑。

**本课要补的缺口**：内核在 `runTool` 之前 **停下来等人**，并把「等批准 / 已拒绝」变成正式 `AgentEvent`，终端用 `y/N` 模拟插件里的批准按钮。

```text
第 34 课及以前：ToolCallStart → 立刻 ToolResult
本课：         ToolCallStart → ToolCallPending →（你批准）→ ToolResult
                                      └→（你拒绝）→ ToolCallDenied → ToolResult(错误)
```

拒绝后仍往 history 里写一条 tool 消息（`用户拒绝执行此工具`），模型下一轮能据此改口——和真产品一致。

---

## 1. 用起来什么样

`npm run ch35` 后，让模型读文件时会 **先提示再执行**：

```text
[工具] pwd({})
  等待你批准…
允许 pwd({})? [y/N] y
  → /Users/you/bagent
[工具] read_file({"path":"/Users/you/bagent/package.json"})
  等待你批准…
允许 read_file(...)? [y/N] y
  → { "name": "bagent", ... }
AI: 项目名是 bagent
```

`read_file` / `ls` 的 `path` **必须是绝对路径**；传 `package.json` 会返回错误，模型应先 `pwd` 再拼路径。

输入 `N` 或回车（默认拒绝）：

```text
允许 read_file(...)? [y/N]
  ✗ 已拒绝 read_file
  → {"error":"用户拒绝执行此工具"}
AI: 好的，没有读文件。你可以自己打开 package.json 看 name 字段。
```

---

## 2. 和第 34 课差在哪

| | 第 34 课 | 第 35 课（本课） |
|--|----------|------------------|
| 工具执行 | `ToolCallStart` 后 **立即** `runTool` | **`await approve(call)`** 后才执行 |
| 事件 | 9 种 | **11 种**（+`ToolCallPending`、`ToolCallDenied`） |
| `turn()` | `turn(userInput)` | `turn(userInput, approve)` — UI 注入审批函数 |
| 终端 | 只展示工具行 | **黄字询问 y/N** |

Thinking 事件与 [第 34 课](/chapters/34-agent-thinking) 相同，本课只改 **工具段**。

---

## 3. 新增事件

```typescript
export type AgentEvent =
  // ... Thinking*、ChunkUpdated 同 34 课
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolCallPending"; name: string; arguments: string }
  | { type: "ToolCallDenied"; name: string }
  | { type: "ToolResult"; name: string; output: string }
  | { type: "TurnEnd"; text: string };
```

| 事件 | 何时 yield |
|------|------------|
| `ToolCallStart` | 模型本轮 tool_calls 已完整，**尚未**执行 |
| `ToolCallPending` | 即将 `await approve()`，UI 应显示「等待批准」 |
| `ToolCallDenied` | 用户拒绝 |
| `ToolResult` | 执行完毕 **或** 拒绝后写入 history 的占位结果 |

---

## 4. 核心实现：外部传入 `approve` 函数

本课审批的要点就一句：**`AgentLoop` 不自己问用户，调用 `turn()` 时从外部传入一个 `approve` 函数。**

### 4.1 谁干什么

```text
chat.ts（UI 层）                         loop.ts（内核）
  │                                          │
  │  agent.turn(user, approve) ─────────────►│
  │                                          │ yield ToolCallStart
  │◄── for await 收到事件 ───────────────────│ yield ToolCallPending
  │  terminal.ts 打印「等待批准」             │
  │                                          │ await approve(call)  ← 停在这里
  │  readline 问 y/N，返回 true/false ───────►│
  │                                          │ runTool 或写拒绝结果
  │◄── ToolResult / ToolCallDenied ──────────│
```

| 层 | 文件 | 职责 |
|----|------|------|
| **内核** | `loop.ts` | 产出事件；在 `runTool` 前 `await approve(call)`；根据布尔值执行或拒绝 |
| **UI** | `chat.ts` | 实现 `approve`：本课用 readline 问 `y/N` |
| **展示** | `terminal.ts` | 只根据事件打字（`[工具]`、`等待批准`、`✗ 已拒绝`），**不做审批逻辑** |

内核不知道 stdin、按钮、JSON-RPC——它只认「给我一个返回 `Promise<boolean>` 的函数」。

### 4.2 类型与 `turn` 签名

```typescript
// loop.ts
export type ApproveTool = (call: ToolCall) => Promise<boolean>;

async *turn(userInput: string, approve: ApproveTool): AsyncGenerator<AgentEvent> {
  // ...
}
```

对比 [第 34 课](/chapters/34-agent-thinking)：`turn(userInput)`，工具在 loop 里直接 `runTool`。  
本课多第二个参数，**把「怎么问用户」交给调用方**——这叫依赖注入，换 UI 不用改 loop。

### 4.3 `chat.ts`：终端里的 `approve` 实现

```typescript
async function approve(call: ToolCall): Promise<boolean> {
  const line = await rl.question(
    `允许 ${call.function.name}(${call.function.arguments})? [y/N] `,
  );
  const s = line.trim().toLowerCase();
  return s === "y" || s === "yes";
}

for await (const event of agent.turn(user, approve)) {
  handleTerminalEvent(event, uiState);
}
```

`approve` 定义在 `chat.ts`，通过 `turn(user, approve)` **注入**进内核。  
将来 VS Code 插件里可以是：收到 `ToolCallPending` 后弹按钮，点击后再 `resolve(true)`——**同一个 `loop.ts`，换一个 `approve` 实现**。

### 4.4 `loop.ts`：在 `runTool` 前等待

```typescript
for (const call of assistant.tool_calls) {
  yield { type: "ToolCallStart", name, arguments: args };
  yield { type: "ToolCallPending", name, arguments: args };

  const ok = await approve(call);   // 挂起，直到外部 approve 返回
  if (!ok) {
    yield { type: "ToolCallDenied", name };
    yield { type: "ToolResult", name, output: DENIED };
    this.history.push({ role: "tool", tool_call_id: call.id, content: DENIED });
    continue;
  }

  const output = runTool(call);
  yield { type: "ToolResult", name, output };
  this.history.push({ role: "tool", tool_call_id: call.id, content: output });
}
```

`async *turn` 在这里的作用：`yield` 把事件推给 UI；`await approve(call)` 在同一轮里**暂停**，用户点头后再继续。

### 4.5 执行顺序（容易晕的一点）

对每一次工具调用，实际顺序是：

1. `for await` 处理 `ToolCallStart` → 终端打印 `[工具] ls(...)`
2. `for await` 处理 `ToolCallPending` → 打印 `等待你批准…`
3. 上面两次 `handleTerminalEvent` 返回后，generator 才执行到 `await approve(call)`
4. `rl.question` 阻塞，等你输入
5. 你输入 `y` / 回车 → `approve` 返回 → 内核 `runTool` 或走拒绝分支
6. `for await` 收到 `ToolResult` 或 `ToolCallDenied`

所以：**先看到事件，再看到询问**——不是 loop 里先 `approve` 再 `yield` Pending。

### 4.6 为什么不把 readline 写进 `loop.ts`？

可以，但 UI 和内核又绑死。终端要 `y/N`，插件要按钮，测试里可以 `approve: async () => true` 全自动跑——**拆开才复用**。  
[第 28 课](/chapters/28-agent-network) server、[第 31 课](/chapters/31-vscode-spawn) worker 都应共用这一套 `loop`，只换 `approve` 从哪来。

### 4.7 审批也是一种 pre-hook（见第 36 课）

概念上，`approve` 和「`runTool` 之前的钩子」是一类事：**执行前闸门，拒绝则不跑工具**。[第 36 课](/chapters/36-tool-hooks) 用 `approvalBefore(approve)` 把它放进 `before[0]`，与截断等钩子走同一条 `runWithHooks` 管线；本课仍用 `loop` 里单独 `await approve` 写法，便于先理解注入，再学统一管线。

---

## 5. 目录

```text
lessons/35-tool-approval/
  events.ts      # +ToolCallPending / ToolCallDenied
  loop.ts        # turn(user, approve)；await approve(call)
  chat.ts        # 定义 approve，注入 turn
  terminal.ts    # 只展示事件，不审批
  stream.ts messages.ts tools.ts color.ts  # 同 34 课
```

---

## 6. 动手

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch35
```

建议试几轮：

1. `当前目录有什么文件？` → 观察是否先 `pwd` / `ls`  
2. `读一下 package.json 的 name` → 输入 **y**（模型应拼绝对路径）  
3. 同样问题 → 输入 **N**，看模型如何回应拒绝  

---

## 7. 和插件课的关系

| 层 | 本课 | 31–32 课插件 |
|----|------|----------------|
| 事件 | ✅ 含 Pending / Denied | 仍缺审批事件 |
| 下一步 | — | Webview 加「允许 / 拒绝」按钮；worker 在 Pending 时 **暂停写 stdin**，等插件回 `{ "op": "approve", "id": "..." }` |

终端的 `y/N` 就是插件按钮的最小替身。

---

## 8. 常见问题

| 现象 | 处理 |
|------|------|
| 没出现询问直接出结果 | 确认跑的是 `ch35` 不是 `ch34` |
| 拒绝后模型还假装读到了 | 看 history 里 tool 是否已是 `用户拒绝`；正常应道歉或换说法 |
| `approve` 能否写进 loop 里读 stdin？ | 可以，但 UI 和内核又耦在一起；本课故意拆开 |

---

## 检查点

- [ ] 第 34 课为什么「能跑 demo」但不够当产品？  
- [ ] **`approve` 是谁传给 `turn` 的？内核里有没有 readline？**  
- [ ] `ToolCallPending` 和 `ToolCallStart` 各告诉 UI 什么？  
- [ ] `await approve(call)` 和 `yield ToolCallPending` 谁先谁后？  
- [ ] 用户拒绝后为什么还要 `push` 一条 `role: "tool"` 消息？  
- [ ] 插件里 `approve` 会怎么实现（对比 readline）？

---

[← 第 34 课](/chapters/34-agent-thinking) · [第 36 课](/chapters/36-tool-hooks) · [第 31 课](/chapters/31-vscode-spawn)
