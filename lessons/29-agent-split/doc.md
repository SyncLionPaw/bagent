# 第 29 课 · 拆开 Agent 与 UI 有什么好处？（扩展阅读）

**约 25 分钟** · 纯阅读 · [第 28 课](/chapters/28-agent-network) 之后

你在 [第 28 课](/chapters/28-agent-network) 已经亲手拆过：**左边 `server` 跑 Loop，右边 `client` 只订阅事件**。本课回答：**为什么要费这事？** 以及 **VS Code 插件** 一类产品通常怎么接。

---

## 1. 不拆也能用，为何要拆

| 阶段 | 本课程 | 够不够用 |
|------|--------|----------|
| 学习 Loop | [第 24 课](/chapters/24-agent-loop) 单进程 | ✅ 最少概念 |
| 流式 + 事件 | [第 25–26 课](/chapters/25-agent-stream) | ✅ UI 与内核开始分层 |
| 双进程 | [第 28 课](/chapters/28-agent-network) | ✅ 像「产品雏形」 |

单进程不是错——**写课、验证想法、个人脚本** 一直够用。拆进程是为了解决 **界面、安全、协作** 一类问题，而这些在「只做终端 demo」时往往还感觉不到。

---

## 2. 拆开的主要好处

### 2.1 换 UI 不改内核

[第 26 课](/chapters/26-agent-events) 的 `AgentEvent` + [第 28 课](/chapters/28-agent-network) 的 SSE，本质是同一件事：

```text
内核只产出事件 → 终端 / 网页 / IDE 各自消费
```

- 今天：终端 `client.ts` + `handleTerminalEvent`  
- 明天：React 网页只改订阅端  
- 后天：VS Code 侧边栏把 `ChunkUpdated` 画进 Webview  

**`loop.ts` / `server.ts` 可以长期稳定**，UI 随便换皮肤、换交互。

### 2.2 密钥与权限留在「重」的一侧

第 28 课里：

- **server** 持有 `DEEPSEEK_API_KEY`、`history`、`read_file`  
- **client** 只有 `fetch localhost:3028`

好处：

- UI 进程可以更「轻」、甚至跑在浏览器沙箱里  
- 少把 Key 散落到每个前端  
- 工具执行集中在一处，便于 **审批、审计、限路径**（[第 36 课](/chapters/36-tool-hooks) `tools.ts` 的白名单就是雏形）

### 2.3 多个客户端，共用一个 Agent

```text
        ┌─ 终端 client.ts
server ─┼─ VS Code 插件
        └─ 将来的网页控制台
```

一个发布端、多个订阅端——适合「团队共用本机 Agent 服务」或「IDE + 脚本并行监控同一 session」（产品里还会加 session id，本课先不展开）。

### 2.4 独立升级与测试

| 测什么 | 拆开后 |
|--------|--------|
| Loop / 工具逻辑 | 只起 server，用 `curl -N` 打 `/chat` |
| UI 渲染 | mock SSE 事件流，不必真调模型 |
| 回归 | 事件 JSON 快照对比，比对比整段终端输出稳 |

第 26 课若把 `terminal.ts` 换成 `assertEvent()`，就是单元测试订阅方，**不必启动 DeepSeek**。

### 2.5 崩溃与卡死隔离

- UI 关窗口：可以只断订阅，server 决定是否保存 `history`  
- 模型卡住：`client` 可以超时断开 SSE，server 另做取消（进阶）  
- 单进程时：一切揉在一起，很难只杀「界面」而不杀「半条 conversation」

---

## 3. VS Code 插件通常长什么样

不必先会写插件。可先读 [第 101 课](/chapters/101-vscode-extension)。下面只记 **角色分工**（对应 [第 28、31 课](/chapters/28-agent-network) 已写的名字）：

```text
┌─────────────────────────────────────────┐
│  VS Code 窗口                            │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ 编辑器       │  │ 侧边栏 / Webview   │  │  ← 订阅端（像 client.ts）
│  │ 选区、诊断   │  │ 流式字、按钮审批   │  │
│  └─────────────┘  └─────────┬────────┘  │
│         Extension Host       │ IPC       │
└──────────────────────────────│──────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Agent 子进程 / 本地服务  │  ← 发布端（像 server.ts）
                    │ Loop、tools、API Key   │
                    └──────────────────────┘
```

常见接法（由简到繁）：

| 接法 | 和本课关系 |
|------|------------|
| **HTTP + SSE**（`localhost:3028`） | 就是 [第 28 课](/chapters/28-agent-network)；插件里 `fetch` 订阅 |
| **stdio + JSON 行** | [第 31 课](/chapters/31-vscode-spawn)：`spawn` 子进程，一行一条 `AgentEvent`；背景见 [第 17 课](/chapters/17-sse-landscape) |
| **约定协议（如 ACP）** | 编辑器生态的标准化事件名；本教程先用自建 `AgentEvent` 学原理，[第 39 课](/chapters/39-agent-client-protocol) 再讲 ACP |

插件侧典型工作：

1. 读用户选中的文件 / 命令面板输入 → 当成 `message`  
2. 订阅事件流 → `ChunkUpdated` 更新侧边栏  
3. `ToolCallStart` 时弹「是否允许读某文件」→ 批准后 server 才 `runTool`（终端内核见 [第 35 课](/chapters/35-tool-approval)；31–32 课插件尚未同步）  
4. `TurnEnd` 后把 diff 预览进编辑器  

**重点**：插件作者大部分时间写的是 **订阅端 + 编辑器 API**，不是重写 Agent Loop。

---

## 4. 和「全塞在一个进程」比，代价是什么

拆开不是免费午餐：

| 代价 | 说明 |
|------|------|
| 部署复杂 | 要先起 server，再开 client |
| 协议要想清楚 | 事件类型、版本、断线重连 |
| 调试跨进程 | 两边日志要对时间戳 |
| 本机延迟 | 多一次 HTTP，通常可忽略 |

所以路径是：**先单进程跑通（24）→ 事件化（26）→ 再拆（28）→ 再想插件（本课）**。跳步容易连 Loop 都没稳住就纠结 Webview。

---

## 5. 课程的完整弧线

```text
24  Loop + history
25  流式 SSE（对模型）
26  领域事件（对内）
27  架构地图（扩展）
28  双进程 + SSE 传事件
29  本课：为何要拆、插件怎么接
```

你截图里 [第 28 课](/chapters/28-agent-network) 左右分屏，已经是 **类型 C** 的迷你版。下一步若做 VS Code 插件：**保留 server，把 client 换成 Extension** 即可，事件表不必推倒重来。

---

## 6. 常见误解

| 误解 | 更接近事实 |
|------|------------|
| 「插件 = Agent 全在插件里」 | 多数是 **插件 UI + 子进程/服务 Loop** |
| 「拆进程就一定要上云」 | 第 28 课全是 **本机两个进程** |
| 「SSE 只能给浏览器」 | Node `fetch` 一样读流；插件也能用 |
| 「必须先学 VS Code API 才能做 Agent」 | 先 [第 24–28 课](/chapters/24-agent-loop) 把 Loop 和事件搞懂更划算 |

---

## 检查点

- [ ] 能说出拆开 UI 后，换界面要改哪一侧吗？  
- [ ] 能解释为什么 API Key 适合放在 server 吗？  
- [ ] 能对照第 28 课说出 VS Code 插件里「订阅端 / 发布端」各是什么吗？  
- [ ] 知道拆分的代价（协议、运维）吗？

---

## 下一课

[第 30 课 · 动手写 VS Code 插件](/chapters/30-vscode-extension) — 订阅 ch28 server 的事件流。

[← 第 28 课](/chapters/28-agent-network) · [第 27 课 架构](/chapters/27-agent-architecture)
