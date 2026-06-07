# 第 40 课 · 插件对齐 ch36 内核

**约 45 分钟** · [第 39 课](/chapters/39-agent-client-protocol) 之后

本课是一个完整的 VS Code 插件：扩展宿主里 spawn Agent 子进程，用 stdio 收发 JSON 事件，Webview 把 [第 36 课](/chapters/36-tool-hooks) 终端内核的画面上屏。工具栈是 **pwd / ls / read_file / grep**（绝对路径，须在 cwd 下），带 **Thinking 流**、**工具审批** 与 **结果截断**。

```text
第 31 课 worker          第 40 课 worker（本课）
──────────────          ──────────────────────
6 种 AgentEvent         与 ch36 相同的 11 种
runTool 直写 history    runWithHooks + approvalBefore
无审批                  stdin 回传 { op: "approve" }
无 Thinking             stream 开 thinking
4 工具（含 web_search）  pwd / ls / read_file / grep
```

[第 31 课](/chapters/31-vscode-spawn) 仍保留旧 4 工具作对照教材；[第 32 课](/chapters/32-vscode-auxiliarybar) 右侧辅助栏 **共用本课 `agent/`**，侧重挂载位置。本课目录 `40-vscode-kernel-upgrade` 把 **内核 + Webview 事件** 讲全，便于和第 31 课 diff。

### 前置

| 主题 | 课文 |
|------|------|
| spawn / stdio | [第 31 课](/chapters/31-vscode-spawn) |
| 工具审批 | [第 35 课](/chapters/35-tool-approval) |
| 钩子截断 | [第 36 课](/chapters/36-tool-hooks) |
| VS Code 插件基础 | [第 101 课](/chapters/101-vscode-extension)、[第 102 课](/chapters/102-vscode-calculator) |
| 右侧辅助栏（可选） | [第 32 课](/chapters/32-vscode-auxiliarybar) |

---

## 1. 用起来什么样

1. **右侧辅助栏** bagent 面板（`secondarySidebar`，与 [第 32 课](/chapters/32-vscode-auxiliarybar) 同侧）
2. 模型推理时，日志里出现可折叠的 **思考** 行（`<details>` / `<summary>`，默认收起，点开看正文）
3. 调 `read_file` / `ls` / `grep` 前出现 **单行审批条**：左侧 `name(args)`，右侧 **✓ / ✗** 图标（`title` 为允许 / 拒绝；参数过长则省略号，`title` 悬停看全文）
4. 读大文件后工具行下方有 **已截断** 黄字（`after` 钩子写入 history，见 [第 36 课](/chapters/36-tool-hooks)）
5. 输入框旁是 **发送图标**（向上箭头），忙时与输入框一并禁用

建议试三句：

- `当前工作目录在哪` → `pwd`
- `读一下 package-lock.json 大概多大` → 先点 **✓**，再看截断说明
- `在 tools.ts 里搜 grep 定义` → `grep` 审批 + `file:line:` 结果
- 同样问题再发一次，点 **✗** → 应出现 `✗ 已拒绝 read_file`

---

## 2. 和第 31 课差在哪

| | 第 31 课 | 第 40 课（本课） |
|--|----------|------------------|
| 内核 | 旧 loop + 4 工具 | **ch36** `loop` / `hooks` / `stream` |
| 事件 | 6 种 | **11 种**（含 Thinking、Pending、Denied） |
| 工具 | read_file / web_search / get_time / calculate | **pwd / ls / read_file / grep**（绝对路径） |
| 审批 | 无 | Webview ✓/✗ → stdio `approve` |
| 截断 | 无 | `after` 钩子写入 history |
| 挂载 | 31 左侧 / 32 右侧（共用本课 agent） | **右侧辅助栏** |

第 31 课故意留着 `web_search` 等旧工具，方便第一次理解 spawn；本课与 ch36 终端对齐，保留文件系统只读四件套（含 [第 41 课](/chapters/41-code-search) 的 `grep`）。

---

## 3. 目录

```text
lessons/40-vscode-kernel-upgrade/
  agent/                 # ch36 内核（CommonJS 编译）
    events.ts loop.ts hooks.ts tools.ts stream.ts worker.ts
  src/
    extension.ts spawn.ts sidebar.ts events.ts apiKey.ts
  package.json           # bagent40 · secondarySidebar
```

`agent/` 与 [第 32 课](/chapters/32-vscode-auxiliarybar) 共用；改内核时以本课为源，32 通过符号链接跟随。

---

## 4. 协议：多了一条 approve

父进程 → 子进程 stdin，在 [第 31 课](/chapters/31-vscode-spawn) 基础上增加：

```json
{"op":"approve","allow":true}
{"op":"approve","allow":false}
```

时序：

```text
worker  yield ToolCallPending
        ↓（子进程在 approve() 里等待）
Webview 用户点 ✓
        ↓ postMessage → extension → stdin approve
worker  runWithHooks → ToolResult（可能带 truncated）
```

---

## 5. 动手

### 5.1 准备 Key

与第 31 课相同：`~/.bagent/deepseek-api-key` 第一行 `sk-...`，或 `export DEEPSEEK_API_KEY`。

### 5.2 编译

在仓库根目录：

```bash
cd /你的路径/bagent
npm run ch40:compile
```

或在 **本课目录** 内：

```bash
cd lessons/40-vscode-kernel-upgrade
npm install && npm run compile
```

应生成 `out/agent/worker.js` 与 `out/extension.js`。

### 5.3 打开并 F5

1. **文件 → 打开文件夹** → `lessons/40-vscode-kernel-upgrade`（**不要**打开 bagent 仓库根目录，否则 `cwd` 与路径会对不上）
2. **F5** → 弹出 **Extension Development Host**
3. 在 **新窗口右侧** 点 bagent 图标，或 `Cmd+Shift+P` → **bagent: 打开 Agent 面板（ch36 内核）**

### 5.4 检查清单

- [ ] 编译无报错
- [ ] 打开的是 **40-vscode-kernel-upgrade** 文件夹
- [ ] 复杂问题能看到可折叠的 **思考** 行
- [ ] `read_file` 前出现单行 **✓ / ✗** 审批
- [ ] 读 `package-lock.json` 后出现 **已截断** 提示

---

## 6. Webview 画什么事件

| 事件 | Webview |
|------|---------|
| `ThinkingStart/Updated/End` | `<details>` 折叠「思考」，流式写入正文 |
| `ToolCallStart` | 黄条 `[工具] name(args)` |
| `ToolCallPending` | 单行 `name(args)` + 右侧 ✓ / ✗ |
| `ToolCallDenied` | 红色 `✗ 已拒绝 name` |
| `ToolResult` + `truncated` | 预览 + 黄字截断说明 |
| `ChunkUpdated` | 灰色 AI 正文气泡 |

展示层 preview 仍可短一些；**history 里已是截断后的正文**（见 [第 36 课 §6](/chapters/36-tool-hooks#_6-展示层-vs-数据层再强调)）。

---

## 7. 相关课文

- [第 32 课](/chapters/32-vscode-auxiliarybar) — 同一内核，只改辅助栏挂载；日常 F5 可先跑 32
- [第 33 课](/chapters/33-vscode-vsix) — 打成 VSIX 时改目录名即可沿用流程
- [第 36 课](/chapters/36-tool-hooks) — `runWithHooks`、`truncateAfter` 源码对照
- [第 39 课](/chapters/39-agent-client-protocol) — 若要把 stdio 换成 ACP，从本课事件表出发

---

## 检查点

- [ ] ch36 的 `approvalBefore` 在插件里由谁实现 `approve`？（`spawn.ts` 写 stdin，`sidebar.ts` 收 postMessage）
- [ ] `ToolCallPending` 之后、子进程为何不能继续？（`approve()` 阻塞等待 stdin）
- [ ] Webview 100 字 preview 与黄字截断说明，哪个进 history？（钩子截断后的 `output` 进 history）

---

[← 第 39 课](/chapters/39-agent-client-protocol) · [第 41 课 · grep](/chapters/41-code-search) · [第 32 课](/chapters/32-vscode-auxiliarybar)
