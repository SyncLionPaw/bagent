# 第 31 课 · 插件 spawn Agent 子进程

**约 40 分钟** · [第 30 课](/chapters/30-vscode-extension) 之后

[第 30 课](/chapters/30-vscode-extension) 要 **另开终端** 跑 `ch28:server`，插件再 `fetch localhost:3028`。本课改成：**插件激活时自己 `spawn` 一个 Node 子进程跑 Agent Loop**，用 **stdio 一行一条 JSON** 传 `AgentEvent`——更接近 Claude Code / Copilot 一类「IDE 拉起 Agent」的接法。

```text
第 30 课：  插件 ──HTTP/SSE──►  ch28 server（你要手动起）

第 31 课：  插件 ──spawn──►  agent/worker.js（插件自己起）
              │  stdin  { op: "chat", message }
              └── stdout  一行一个 AgentEvent JSON
```

---

## 1. 用起来什么样

1. 活动栏 **对话图标**（bagent31）→ 侧边栏 **BAGENT: AGENT**  
2. 顶部灰字 **`插件已 spawn Agent 子进程（stdio），无需 ch28:server`**  
3. 发送后流式气泡；`ToolCallStart` 显示黄条 **`[工具] get_time` / `web_search`** 等  

F5 跑通后大致是这样（**Extension Development Host** 新窗口 = 窗口 B）：

![VS Code 侧边栏 spawn 子进程与工具调用](/lessons/31-vscode-spawn/image.png)

- 标题栏 **`[Extension Development Host]`** = 插件调试窗口  
- 问「这时候几点了」→ `[工具] get_time({})` → 按上海时区回答  
- 问「浙江报考人数」→ `[工具] web_search({"query":"..."})` → 联网摘要（需 Tavily Key）  
- UI 与 [第 30 课](/chapters/30-vscode-extension) 同款 Webview 气泡；**不用** 另开 `ch28:server` 终端  

---

## 2. 和第 28 / 30 课差在哪

| | 第 28 课 | 第 30 课 | 第 31 课（本课） |
|--|----------|----------|------------------|
| Agent 在哪 | 独立 `server.ts` | 同上 | `agent/worker.ts` 子进程 |
| 谁启动 Agent | 你手动 `ch28:server` | 同上 | **插件 `activate` 时 spawn** |
| 传输 | SSE `data: {...}` | `fetch` 订阅 SSE | **stdin / stdout NDJSON** |
| 端口 | 固定 3028 | 要配 `serverUrl` | **无端口** |

事件类型仍是同一个 `AgentEvent`；变的只是 **管道**（HTTP → stdio）。

本课 Agent 自带工具（与 [第 8–9 课](/chapters/09-tavily) 同源）：

| 工具 | 作用 | 需要 Key |
|------|------|----------|
| `read_file` | 读工作区 `package.json` / `README.md` | 无 |
| `web_search` | Tavily 联网搜索 | `~/.bagent/tavily-api-key` |
| `get_time` | 上海时区当前时间 | 无 |
| `calculate` | 安全算式 `(128+256)*3` | 无 |

---

## 3. 目录

```text
lessons/31-vscode-spawn/
  agent/
    worker.ts       # 子进程入口：读 stdin，写 stdout
    loop.ts         # Agent Loop（与 ch28 同逻辑，本课自包含）
    stream.ts tools.ts events.ts messages.ts
  src/
    apiKey.ts       # 从 ~/.bagent/deepseek-api-key 或环境变量读 Key
    extension.ts    # activate 时 spawn，deactivate 时 shutdown
    spawn.ts        # ChildProcess + readline 解析 stdout
    sidebar.ts      # Webview UI（与第 30 课几乎相同）
    events.ts
```

---

## 4. 协议：stdio 上一行一个 JSON

**父进程 → 子进程（stdin）**

```json
{"op":"chat","message":"读一下 package.json"}
{"op":"shutdown"}
```

**子进程 → 父进程（stdout）**

每行一个 `AgentEvent`，与第 28 课 SSE 的 `data:` 载荷相同：

```json
{"type":"TurnStart","userInput":"..."}
{"type":"ChunkUpdated","text":"你"}
{"type":"TurnEnd","text":"..."}
```

日志、报错走 **stderr**，不混进 stdout，否则会把 JSON 解析搞乱。

---

## 5. 动手（零基础版）

没写过 VS Code 插件也照做。和第 30 课相比：**不用另开终端跑 server**，但要 **先准备好 Key 文件**。

### 5.0 先搞清：两个窗口（没有第三个终端）

```text
┌─────────────────────────────┐     F5      ┌──────────────────────────────────┐
│ 窗口 A：写插件代码的窗口       │  ───────►  │ 窗口 B：Extension Development Host │
│ 打开 lessons/31-vscode-spawn │            │ 标题带 [Extension Development Host] │
│ 在这里按 F5                  │            │ 在这里用侧边栏聊天 ← 试这个       │
└─────────────────────────────┘            └──────────────────────────────────┘
         │
         └── F5 时插件在后台 spawn 子进程（agent/worker.js），不用你手起 ch28:server
```

- **窗口 A**：资源管理器里是 `src/`、`agent/`、`package.json`。  
- **窗口 B**：F5 后 **弹出的新窗口**，插件只装在这里。  
- **常见失误**：在窗口 A 里找对话图标——要去 **窗口 B**。  
- **和第 30 课不同**：不需要 `npm run ch28:server` 那个常开终端。

更细的 F5 概念也可看 [第 30 课 §3](/chapters/30-vscode-extension#_3-动手零基础版)，流程一样，只是不用起 server。

---

### 5.1 准备 API Key 文件（只需做一次）

默认从 **`~/.bagent/deepseek-api-key`** 读（第一行写 `sk-...`）：

```bash
mkdir -p ~/.bagent
echo 'sk-你的密钥' > ~/.bagent/deepseek-api-key
chmod 600 ~/.bagent/deepseek-api-key
```

文件示例：

```text
# DeepSeek API Key（# 开头是注释，会跳过）
sk-xxxxxxxxxxxxxxxx
```

**读取顺序**

1. 若本机已 `export DEEPSEEK_API_KEY` → **优先用环境变量**（覆盖文件）  
2. 否则读上面的文件  

**换路径**：`Cmd+,` 打开设置 → 搜 **`bagent31 apiKeyPath`**，或在 `settings.json` 写：

```json
"bagent31.apiKeyPath": "~/.bagent/deepseek-api-key"
```

支持 `~/...`、绝对路径、相对当前工作区（如 `.bagent/key`）。  
插件读到 Key 后 **注入子进程**；子进程内仍用 `process.env.DEEPSEEK_API_KEY` 调 API。

没 DeepSeek Key 时 F5 会弹 **`未找到 DeepSeek API Key`**，侧边栏不会出现——先建好文件再 F5。

**Tavily（联网搜索，可选）**

```bash
echo 'tvly-你的密钥' > ~/.bagent/tavily-api-key
chmod 600 ~/.bagent/tavily-api-key
```

未配置时插件会 **黄色提示**，但 `get_time` / `calculate` / `read_file` 仍可用；只有问「搜一下…」时 `web_search` 会返回未配置说明。  
申请 Key：[Tavily](https://app.tavily.com)。路径可在设置 **`bagent31.tavilyApiKeyPath`** 修改。

---

### 5.2 编译插件（在 bagent 根目录）

```bash
cd /你的路径/bagent
npm run ch31:compile
```

应生成：

```text
lessons/31-vscode-spawn/out/extension.js
lessons/31-vscode-spawn/out/agent/worker.js
```

改 `src/` 或 `agent/` 后都要重新跑这条。

---

### 5.3 窗口 A：只打开本课文件夹

1. **文件 → 关闭文件夹**（若正开着整个 bagent 大仓库）。  
2. **文件 → 打开文件夹…** → 选 **`bagent/lessons/31-vscode-spawn`**。  

**不要** 打开 bagent 根目录——没有本课 `.vscode/launch.json`，F5 会懵。

打开对了，左侧顶层类似：

```text
31-VSCODE-SPAWN
  .vscode
  agent
  src
  out
  package.json
```

---

### 5.4 按 F5，弹出窗口 B

1. **窗口 A** 按 **F5**（或 **运行 → 启动调试** → **「运行第 31 课插件」**）。  
2. 弹出标题带 **`[Extension Development Host]`** 的新窗口 = **窗口 B**。  
3. 若 Key 文件缺失，窗口 A 会先报错，先回到 5.1。

---

### 5.5 窗口 B：侧边栏聊天

在 **窗口 B**：

1. 活动栏点 **对话气泡图标**（bagent31）。  
2. 面板标题类似 **BAGENT: AGENT**，灰字 **`无需 ch28:server`**。  
3. 输入问题 → **发送** → 蓝/灰气泡流式增长。  

找不到图标：`Cmd+Shift+P` → **`bagent: 打开侧边栏（spawn）`**。

试几句：

- `读一下 package.json 里 name 是什么` → `[工具] read_file`
- `现在几点` → `[工具] get_time`
- `(128+256)*3 等于多少` → `[工具] calculate`
- `搜一下 TypeScript 5.8 有什么新特性` → `[工具] web_search`（需 Tavily Key）

效果见上文 [§1 截图](/chapters/31-vscode-spawn#_1-用起来什么样)。

---

### 5.6 改代码后刷新

1. `npm run ch31:compile`  
2. 窗口 B **Cmd+R**（Mac）或 **Ctrl+R**（Win），或关掉窗口 B 再 F5  

改 `agent/` 也必须 compile（子进程跑的是 `out/agent/worker.js`）。

---

### 5.7 一条龙检查清单

- [ ] `~/.bagent/deepseek-api-key` 第一行是有效 `sk-...`  
- [ ] （可选）`~/.bagent/tavily-api-key` 已写 `tvly-...` 以便 `web_search`  
- [ ] `npm run ch31:compile` 无报错，`out/agent/worker.js` 存在  
- [ ] 窗口 A 打开的是 **`31-vscode-spawn`**，不是整个 bagent  
- [ ] F5 后出现 **窗口 B**（标题带 Extension Development Host）  
- [ ] 在 **窗口 B** 发消息能流式出字  
- [ ] **没有** 另开 `ch28:server` 终端

---

## 6. 核心代码走读

### 6.1 `extension.ts`：读 Key + 激活时 spawn

```text
activate()
  → apiKey.ts 读 ~/.bagent/deepseek-api-key（或环境变量）
  → new AgentProcess()
  → spawn(node, out/agent/worker.js, { cwd: 工作区, env: { DEEPSEEK_API_KEY, TAVILY_API_KEY? } })
  → deactivate / 关窗口时 stdin 写 shutdown
```

`cwd` 设为当前工作区，这样 `read_file` 才能读到项目里的 `package.json`。

### 6.2 `spawn.ts`：父进程

```text
stdin.write('{"op":"chat","message":"..."}\n')
stdout 每行 JSON → onEvent → postMessage 给 Webview
收到 TurnEnd → 本轮结束
```

### 6.3 `agent/worker.ts`：子进程

```text
readline(stdin) 每行 → agent.turn(message)
for await (event of turn) → stdout.write(JSON.stringify(event)+'\n')
```

Loop / stream / tools 与第 28 课同源，本课 **不 import ch28**（插件 CommonJS 与课程 ESM 分开编译）。

---

## 7. 常见问题

| 现象 | 处理 |
|------|------|
| F5 没反应 / 无调试配置 | 是否打开 **`31-vscode-spawn`** 文件夹（见 5.3） |
| `未找到 DeepSeek API Key` | 建 `~/.bagent/deepseek-api-key`；或检查 `bagent31.apiKeyPath`；文件勿留空行在首行 |
| 看不到对话图标 | 你在 **窗口 A** 吗？去 **窗口 B** |
| `Agent 子进程未启动` | 是否 compile；看调试控制台 `[bagent agent]` |
| `read_file` 找不到文件 | 窗口 B 工作区里要有 `package.json`（子进程 cwd=工作区根） |
| `web_search` 说未配置 Key | 建 `~/.bagent/tavily-api-key` 或 export `TAVILY_API_KEY` 后重载窗口 |
| 与第 30 课图标冲突 | 两课别同时在同一 Extension Host 调试；本课 id 为 `bagent31` |

---

## 8. 和 Claude Code 的关系

Claude Code 也是 **IDE 侧拉起 Agent 相关进程**，再用管道 / WebSocket 通信；本课用最朴素的 **stdio + JSON 行**，没有随机端口、没有 lock 文件，但 **「谁 spawn 谁、事件怎么流」** 同一类问题。

若还要 **远程** 或多客户端订阅，仍回到第 28 课的 HTTP+SSE；本课适合 **单机、装完即用、不想手起 server**。

---

## 检查点

- [ ] 能画出 stdin / stdout 各传什么吗？
- [ ] 为何 stderr 不能打普通日志到 stdout？
- [ ] 子进程 `cwd` 为何要用工作区根目录？

---

[← 第 30 课](/chapters/30-vscode-extension) · [第 32 课 · 右侧辅助栏](/chapters/32-vscode-auxiliarybar) · [第 29 课](/chapters/29-agent-split)
