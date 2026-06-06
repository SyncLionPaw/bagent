# 第 37 课 · 输入循环与 Agent 循环为什么要拆开？（扩展阅读）

**约 35 分钟** · 纯阅读 · [第 36 课](/chapters/36-tool-hooks) 之后

[第 27 课](/chapters/27-agent-architecture) 提过：在 `await agent.turn()` 期间 **不能边生成边打字**。  
[第 35–36 课](/chapters/35-tool-approval) 的 `chat.ts` 仍是 **一个 `while` 把两件事串死**。  
本课讲清 **两个循环** 为什么要拆，以及为什么在 **单块终端** 里硬做 inbox / steer **性价很低**——根子是 **输入和输出共抢一块 TTY**。

本课 **不写新代码**（第 24–36 课终端 demo 故意保持串行，降低认知负担）。

---

## 1. 你现在其实有两个循环，但被写成了一个

打开 [第 36 课](/chapters/36-tool-hooks) 的 `chat.ts`，逻辑是：

```typescript
while (true) {
  const user = await rl.question("你: ");     // ① 输入
  for await (const event of agent.turn(...)) { // ② Agent
    handleTerminalEvent(event, uiState);
  }
}
```

概念上这是 **两条循环**，只是用 `await` **串成一条链**：

| 循环 | 干什么 | 在代码里 |
|------|--------|----------|
| **输入循环** | 读键盘、显示提示、收审批 `y/N` | `rl.question`、`approve` |
| **Agent 循环** | 调 API、流式事件、跑工具、写 history | `agent.turn` → `loop` → `stream` |

```text
现在的写法（串行）：

  输入 ──await──► Agent turn ──await──► 输入 ──await──► Agent turn …
         ↑                              ↑
    只有 turn 完全结束，才回到 question
```

对产品来说，你希望的是：

```text
想要的（并发交错）：

  输入 ──┐                    ┌── 随时能打字
         ├── 中间用队列/消息 ──┤
  Agent ─┘                    └── 边流式输出边收新指令
```

**拆开**的意思不是「一定要两个进程」，而是：**别让 `question()` 和 `turn()` 互相 `await` 卡在同一根调用链上**。

---

## 2. 为什么 `await` 了还能流式，却不能插嘴？

[第 27 课](/chapters/27-agent-architecture) 4.4 节的时间线再压缩一下：

```text
chat: await rl.question()        ← 事件循环在等键盘，可以
chat: for await (agent.turn())   ← 外层卡在这一行
  stream: await reader.read()    ← 等网络时 JS 让出 CPU，可以处理别的微任务
  yield ChunkUpdated             ← 终端继续打字
  await approve() → rl.question  ← 审批时又能读键盘，但……
```

容易误会的一点：

> 「流式时 `await reader.read()` 会让出事件循环，所以应该能同时读 stdin 吧？」

**不能**——因为外层已经进了 `for await (turn)`，**没有第二个 `rl.question()` 在跑**。  
事件循环空闲时可以去干别的事，但你的 `chat.ts` **没安排**「读下一条用户话」这段逻辑。

审批是 **唯一例外**：`approve` 在 `turn` **内部** 又调了一次 `question`，所以工具前你能按 `y/N`——但那是 **嵌在 Agent 管线里的输入**，不是「随便插一句新话题」。

| 场景 | 第 36 课能不能 |
|------|----------------|
| AI 流式打字时，你再输入「停，别读了」 | ❌ |
| 工具审批 `y/N` | ✅（`approve` 在 turn 里） |
| AI 思考时改主意 | ❌ |
| `/quit` 立刻结束（不等 turn 完） | ❌（要等当前 turn 结束或报错） |

---

## 3. 拆开之后长什么样（概念）

### 3.1 同进程：两个 async 任务 + 信箱

仍在 **一个 Node 进程**、一个事件循环里，可以写成：

```text
┌─────────────────────────────────────────┐
│  任务 A：输入循环（一直跑）               │
│    line = await rl.question()           │
│    inbox.push(line)                     │
├─────────────────────────────────────────┤
│  任务 B：Agent 循环（一直跑）             │
│    msg = await inbox.take()             │
│    for await (event of turn(msg)) …     │
└─────────────────────────────────────────┘
```

- **A 从不 `await turn()`**——只往信箱塞字符串  
- **B 消费信箱、产出事件**  
- 若 AI 还在流式输出时你又敲了一行，队列里 **先堆着**（FIFO）；**steer** 则是插队改向，要另加规则  

### 3.2 双进程：第 28 / 31 课已经「物理拆开」

[第 28 课](/chapters/28-agent-network)：`client` 与 `server` 各有一个事件循环。  
[第 31 课](/chapters/31-vscode-spawn)：侧边栏 Webview + worker 子进程。  

| 拆法 | 进程数 | 本课程例子 |
|------|--------|------------|
| 串行 `await` | 1 | 第 24–36 课 `chat.ts` |
| 队列 + 双任务 | 1 | 概念可行，见下节终端局限 |
| 网络 / stdio IPC | 2+ | 第 28、31 课 |

---

## 4. 更尴尬的一层：输入和输出共用终端

第 3 节解决的是 **JS 里谁 `await` 谁**。还有一层更根本：

```text
单块 TTY（第 24–36 课）
┌──────────────────────────────┐
│  stdout：【思考】、AI 字、工具   │
│  stdin：  readline 的 「你:」  │  ← 同一窗口，同一光标
└──────────────────────────────┘
```

`handleTerminalEvent` 往 **stdout** 流式 `write`；`rl.question` 在 **同一屏** 底部占一行当提示符。  
即使用双循环 + inbox，只要还在 **readline + console.log** 模型里，就会：

- AI 打字和 `你:` / `y/N` **抢行**  
- 每个流式 token 若刷新 prompt，会刷满屏 `(忙碌中)`  
- `rl.pause()` / 少刷 prompt 只是 **协调补丁**，不是分区  

**结论**：inbox、cancel、`AbortSignal` 在 **内核层** 仍然正确；但在 **单屏 readline** 里做完整产品，投入大、体验差。  
终端产品要走 **CLI + TUI 分屏**（[第 38 课](/chapters/38-agent-product) 产品 ①）；插件走 **Webview 分屏**（产品 ②）。不在 readline 单屏上硬做 inbox 课。

---

## 5. 解决方案（按推荐顺序）

### 5.1 浏览器 / 网页：聊天区 + 输入框（推荐先做）

[第 28 课](/chapters/28-agent-network) 模式：server 产 `AgentEvent`，SSE 推到前端。

```text
┌─────────────────┐
│ 消息区（div）     │  ← ChunkUpdated、Thinking、工具行
├─────────────────┤
│ <textarea> 发送  │  ← 与流式输出无关
└─────────────────┘
```

内核仍是 `loop` + hooks + `approve`；**换 UI 壳**，不跟 stdout 抢。  
inbox、cancel 在网页里自然：输入框常显，Cancel 按钮 `AbortSignal`。

### 5.2 IDE Webview（第 31–32 课方向）

侧边栏 **上消息、下输入**；`ToolCallPending` → 批准按钮。  
与 Cursor / VS Code 插件同款；要把 [第 34–36 课](/chapters/34-agent-thinking) 的事件与钩子同步进 worker。

### 5.3 终端 TUI 分屏 → **产品 ① CLI**（第 38 课）

不用 readline 混写，**bagent CLI** 用全屏 TUI 划两块：

| 库 | 思路 |
|----|------|
| [Ink](https://github.com/vadimdemedes/ink) | `<Static>` 历史 + 底部 `<TextInput>` |
| `blessed` / `neo-blessed` | 上 `log` 框 + 下 `textbox` |

Agent 循环只更新 **上方消息区**；输入 **永远在底栏**——与插件 Webview **同构**，只是渲染从 DOM 换成 TUI。

### 5.4 终端内协调（第 36 课，有天花板）

串行 `question` → `turn`，审批嵌在 `turn` 里。  
**够学 Loop**；不追求 steer、不边流式边插话。  
双循环 + `rl.pause()` 属此档补丁，本课 **不单独开课**。

### 5.5 对照

| 方案 | 输出 | 输入 | 本课建议 |
|------|------|------|----------|
| readline 单屏 | stdout 流式 | 同行 prompt | 24–36 **学内核** |
| TUI 分屏 | 上面板 | 底栏 | **产品 ① CLI** |
| Webview 分屏 | 消息区 DOM | 独立输入框 | **产品 ② 插件** |

---

## 6. 和「渲染」的关系

| 名字 | 做什么 |
|------|--------|
| **输入循环** | 收用户字、命令、审批 |
| **Agent 循环** | turn、工具、history |
| **渲染** | `AgentEvent` → 终端 / Webview / TUI 面板 |

```text
键盘 → 输入循环 → inbox（概念）
inbox → Agent 循环 → AgentEvent → 渲染（必须和输入区分开屏）
```

---

## 7. 后续课程会怎么接

| 能力 | 你会在哪遇到 |
|------|--------------|
| 双循环 + inbox | 概念在本课；**动手**在 TUI / Webview（输入输出已分屏） |
| Cancel / `AbortSignal` | 与分屏 UI、server 一起做 |
| Steer（流式中插话） | 独立输入框的产品里（如 Kimi 的 `Ctrl-S`） |
| Thinking、审批、钩子 | ch34–36 已学；ch28 server / ch31 worker 将来对齐 |

```text
第 36 课：串行终端 chat（学完内核即可）
第 37 课：两个循环 + 单 TTY 局限（本课）
第 38 课：三种产品形态
第 39 课：ACP（IDE 行业标准）
```

---

## 8. 审批放在哪？

[第 36 课](/chapters/36-tool-hooks) 的 `approvalBefore` 在终端里仍要读键盘。

| 放法 | 场景 |
|------|------|
| **A. turn 内 await 审批** | 第 36 课终端 `y/N` |
| **B. 事件 + 按钮** | Webview；[第 17 课](/chapters/17-sse-landscape) JSON-RPC `request` 同构 |

分屏 UI 下用 **B**；单屏终端只能用 **A**，且和流式输出抢行。

---

## 9. 常见误解

| 误解 | 正解 |
|------|------|
| 「拆开双循环 = 终端体验就好了」 | 还要 **输入区 / 输出区分开** |
| 「有流式就能插嘴」 | 流式只解决输出边显；单屏 readline 仍挡路 |
| 「双进程就自动 steer」 | 第 28 课 client 仍可一发一收 |
| 「inbox 在终端值得一整课」 | 内核有用；**单 TTY demo 性价比低**，见 §4 |

---

## 检查点

- [ ] 「输入循环」和「Agent 循环」在 `chat.ts` 里各对应哪几行？  
- [ ] 为什么流式 `await reader.read()` 不等于「能边输出边读新用户话」？  
- [ ] **stdout 和 readline 为什么会在同一终端里抢？**  
- [ ] 网页分屏、Webview、TUI 分别怎么避开这个问题？  
- [ ] 为什么本课不在终端单独做 inbox 动手课？

---

[← 第 36 课](/chapters/36-tool-hooks) · [第 38 课 · 三种产品形态](/chapters/38-agent-product) · [第 27 课](/chapters/27-agent-architecture)
