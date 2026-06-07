# 第 38 课 · 还要什么，才算 Code Agent 产品？

**约 30 分钟** · 纯阅读 · [第 37 课](/chapters/37-two-loops) 之后 · **第三阶段收官**

[第 34–36 课](/chapters/34-agent-thinking) 把 **Agent 内核** 补到能讲清原理：Thinking、审批、钩子。  
[第 37 课](/chapters/37-two-loops) 说明：好用的交互必须 **输入区 / 输出区分开**——CLI 用 TUI，IDE 用 Webview，网页用 div + 输入框。

本课回答：**内核跑通之后，完整产品通常长什么样？** 你会看到三种常见形态，以及它们如何共用同一套 `loop` 和 `AgentEvent`。

---

## 1. 三种形态，一个内核

```text
                         ┌─────────────────────┐
                         │  Agent 内核（共享）   │
                         │  loop · events      │
                         │  hooks · tools      │
                         │  stream · approve   │
                         └──────────┬──────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ ① CLI           │      │ ② IDE 插件       │      │ ③ 自有 UI        │
│ 终端 TUI 分屏    │      │ Webview 分屏     │      │ 你设计的前端      │
│                 │      │                 │      │ React / 网页…    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

| | **① CLI** | **② IDE 插件** | **③ 自有 UI** |
|--|-----------|----------------|---------------|
| **谁用** | 习惯终端的开发者 | 日常在 VS Code 等 IDE 里的人 | 要自定义界面、内网控制台、品牌站的人 |
| **壳是什么** | Ink / blessed 等 TUI | [第 31–32 课](/chapters/31-vscode-spawn) 的 Webview | 任意前端（[第 28 课](/chapters/28-agent-network) SSE、[第 20 课](/chapters/20-web-stream-server) 网关） |
| **怎么连内核** | 进程内 `for await (turn)` | stdio 一行一条 JSON（worker） | HTTP/SSE；审批用带 `id` 的回包 |
| **谁画 UI** | CLI 程序里的 TUI 组件 | 插件里的 Webview | **你的** HTML / React |
| **内核从哪来** | 与 ch36 同构的 `loop` | 迁入 worker 的同一份代码 | 同一 `server` 或同包 `import` |

要点：**不是抄三份 Loop**——而是 **`AgentEvent` 稳定**，三种壳各自负责 **渲染 + 传输**。

[第 29 课](/chapters/29-agent-split) 说过：内核只产出事件，终端 / 网页 / IDE **各自订阅**。③ 是这一条在产品里的正式位置。

[第 36 课](/chapters/36-tool-hooks) 的 `npm run ch36` 是 **内核实验台**（readline 单屏，故意简陋，只教原理）。

---

## 2. 本教程里的 Agent 边界

学完第三阶段，你应该能说出「一个本机 Code Agent」通常包含什么、刻意不碰什么：

| 要素 | 本教程范围 |
|------|------------|
| **模型** | 云端 API（DeepSeek 等），Key 放在 `~/.bagent/` 或 server 进程 |
| **工具** | `pwd` / `ls` / `read_file`（绝对路径） |
| **安全** | 读项目须 **审批**；工具输出 **截断** |
| **思考** | Thinking 与正文 **分事件**（[第 34 课](/chapters/34-agent-thinking)） |
| **三种用法** | 终端 TUI · IDE 插件 · 网页订阅 server |
| **刻意不做（现阶段）** | 不写盘工具、不对标 Cursor 全功能、不先上 RAG / MCP 全家桶；写盘与 diff 预览见规划中的 [第 120 课](/chapters/120-edit-diff) |

---

## 3. 形态 ①：终端 CLI

| ch36（你现在跑的） | 像样的 CLI 产品 |
|-------------------|----------------|
| readline，输出和输入抢一行 | **TUI**：上消息、下输入 |
| `npm run ch36` | 全局命令（如 `bagent`） |

要做成产品，壳侧至少要会：

| 能力 | 为什么 |
|------|--------|
| 只根据 `AgentEvent` 渲染 | 和 [第 37 课](/chapters/37-two-loops) 的分屏一致 |
| 内核抽成可 `import` 的包 | CLI、worker、server **共用**，不复制粘贴 |
| `bin` 发布 | 别人一条命令能装 |

---

## 4. 形态 ②：IDE 插件

[第 31–32 课](/chapters/31-vscode-spawn) 你已经见过雏形：插件 `spawn` worker，stdio 传 `AgentEvent`。

| 31–32 课（现状） | 对齐 ch36 之后 |
|-----------------|----------------|
| 较早的 6 种事件 | Thinking、Pending、截断等 **与 ch36 一致** |
| 工具可能直接执行 | Webview **允许 / 拒绝**（[第 35 课](/chapters/35-tool-approval) 语义） |

插件作者大部分时间写的是 **Webview + 编辑器 API**，不是重写 Loop——这和 [第 29 课](/chapters/29-agent-split) §3 一致。

---

## 5. 形态 ③：自有 UI（开放订阅）

**不是第四种内核**——是 **不绑某一种官方壳**，用你自己的页面连同一套 Agent。

### 5.1 为什么需要这一档

- 有人要 **品牌控制台、Electron 桌面、内网工作台**——不一定用终端或 VS Code  
- [第 28 课](/chapters/28-agent-network) 已演示：`server` 产事件，`client` 只 `fetch` SSE  
- [第 17 课](/chapters/17-sse-landscape)：审批可走 **JSON-RPC `request` + `id`**，前端回 `result` 即可  

你只写 **订阅端 + 交互**，不必重写 Loop。

### 5.2 典型接法

```text
┌──────────────────┐     SSE / WebSocket      ┌──────────────────┐
│  你的 UI          │ ◄────────────────────── │  Agent server    │
│  React / Vue …    │ ── POST /chat ────────► │  loop + hooks     │
│  消息区 + 输入框   │ ◄── ApprovalRequest ── │  Key · tools      │
└──────────────────┘     POST /approve      └──────────────────┘
```

| 方向 | 传什么 |
|------|--------|
| **server → UI** | 一行一条 `AgentEvent` JSON（与 26、28、31 同构） |
| **UI → server** | 用户消息、`approve` / `deny` |
| **UI 不负责** | `fetch` DeepSeek、跑 `read_file`、拼 `messages` |

### 5.3 自己写网页 UI 时还要补什么

| 项 | 说明 |
|----|------|
| **HTTP API** | POST 发话、SSE 收事件、POST 审批（在 ch28 server 上升格） |
| **类型或 Schema** | `AgentEvent` 字段固定，前端不用猜 |
| **事件表** | Thinking / Pending / `truncated` 各怎么画 |
| **CORS / localhost** | 浏览器连本机端口（20、28 课已有先例） |

### 5.4 与 CLI / 插件的关系

| | CLI / 插件 | 自有 UI |
|--|------------|---------|
| 界面谁写 | 教程示例里的 TUI / Webview | **你** |
| 内核 | 同一份 `loop` | 连同一个 server 或同包 import |
| 能力对齐 | 靠 **同一套 `AgentEvent`** | 同上 |

插件 worker = **stdio 版 server**；网页 = **HTTP 版 server**——内核一份，管道不同。

---

## 6. 共享内核：只写一次

```text
packages/agent（概念上由 ch36 升格）
  events · loop · hooks · tools · stream
        │
        ├──► cli/tui           → ①
        ├──► agent/worker.ts   → ②
        └──► server.ts         → ③
```

| 内核做一次 | 各壳只做 |
|------------|----------|
| 协议、钩子、工具 | **渲染** + **传输** |
| `approve` 语义 | 终端 `y/N` / 按钮 / HTTP 回包 |

---

## 7. 三种形态对照

```text
① CLI          进程内 turn + TUI 渲染
② 插件         worker stdio + Webview
③ 自有 UI      server SSE + 任意前端（输入输出天然分屏）
```

③ 往往 **最容易做好分屏**——浏览器的 div + textarea 本来就在 [第 37 课](/chapters/37-two-loops) 说的「正确分区」里。

---

## 8. 第四部分预告

第三阶段（22–38）把 **内核原理 + 产品全景** 讲完。第四部分（39 课起）会 **动手**：

```text
39   ACP：IDE 怎么连 Agent（纯阅读）
40+  内核抽包 → CLI TUI / 插件对齐 ch36 / server + 示例 UI
```

[第 39 课](/chapters/39-agent-client-protocol) 先讲 **ACP**——行业里 IDE 接 Agent 的开放协议，再写代码。

动手前，先分清你要改的是 **内核** 还是某一个 **壳**；三种形态应共用同一套事件，不要复制三份 `loop.ts`。

---

## 9. 教程课 vs 产品壳

| | 教程（如 ch36） | ① CLI | ② 插件 | ③ 自有 UI |
|--|----------------|-------|--------|-----------|
| 目的 | 学内核 | 终端里用 | IDE 里用 | 自己的界面 |
| ch36 | 直接跑 | 将来 TUI 包一层 | worker 复用代码 | server 复用代码 |
| ch28 | 双进程入门 | — | — | **订阅范式** |

---

## 10. 本教程刻意不碰的（先建立预期）

- 不做 Cursor 全量替代  
- 不做云端多租户沙箱（网页 UI 仍连 **本机 server**）  
- 不在 readline 单屏上冒充「正式 CLI」  
- 不维护多套 `loop` / 多套事件名  
- 不先 RAG / MCP 全家桶（第四部分以后按需加）

---

## 检查点

- [ ] 三种形态分别是什么？共用什么是？  
- [ ] 自有 UI 和 [第 28 课](/chapters/28-agent-network) client 有什么关系？  
- [ ] 审批在三种形态里各怎么回传？  
- [ ] 为什么自有 UI 往往最容易做「上下分屏」？  
- [ ] ch36 的 readline 和正式 CLI 产品差在哪？

---

[← 第 37 课](/chapters/37-two-loops) · [第 39 课 · ACP](/chapters/39-agent-client-protocol) · [第 28 课](/chapters/28-agent-network) · [第 36 课](/chapters/36-tool-hooks)
