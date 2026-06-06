# 第 30 课 · VS Code 侧边栏插件

**约 45 分钟** · [第 29 课](/chapters/29-agent-split) 之后

订阅 [第 28 课](/chapters/28-agent-network) 的 Agent 事件，在 **左侧活动栏** 打开聊天侧边栏：输入框 + 气泡流式回复，不用命令面板、不用输出面板。

```text
ch28 server  ──SSE──►  侧边栏 Webview（本课）
```

---

## 1. 用起来什么样

1. 活动栏多了一个 **对话图标**（bagent）  
2. 点开侧边栏：**上面聊天记录，下面输入框**  
3. 发送后 `ChunkUpdated` 逐字追加到 AI 气泡，`ToolCallStart` 显示黄条工具行  

内核仍是 `subscribe.ts` 解析 `AgentEvent`；只是 **渲染从 Output Channel 换成 Webview HTML**。

F5 跑通后大致是这样（**Extension Development Host** 新窗口，左侧 **BAGENT: AGENT**）：

![VS Code 侧边栏聊天气泡](/lessons/30-vscode-extension/image.png)

- 标题栏 **`[Extension Development Host]`** = 插件调试窗口  
- 活动栏 **对话图标** → 侧边栏输入框 + 蓝/灰气泡  
- 顶部灰字 `需先 npm run ch28:server` 提醒先起发布端  
- 流式正文、`[工具] read_file(...)` 与第 28 课终端 client 同源，只是画在 Webview 里  

---

## 2. 目录

```text
lessons/30-vscode-extension/
  src/extension.ts      # 注册 WebviewViewProvider
  src/sidebar.ts        # 侧边栏 HTML + 与 extension 通信
  src/subscribe.ts      # SSE 订阅（同 ch28 client）
  src/events.ts
  package.json          # viewsContainers + views
```

---

## 3. 动手（零基础版）

没写过 VS Code 插件也照做即可。全程会涉及 **两个窗口、两个终端**，第一次容易晕，下面按顺序来。

### 3.0 先搞清：两个窗口各是什么

```text
┌─────────────────────────────┐     F5      ┌──────────────────────────────────┐
│ 窗口 A：写插件代码的窗口       │  ───────►  │ 窗口 B：Extension Development Host │
│ 打开 lessons/30-vscode-…    │            │ 标题带 [Extension Development Host] │
│ 在这里按 F5，看调试日志       │            │ 在这里用侧边栏聊天 ← 你要试的是这个 │
└─────────────────────────────┘            └──────────────────────────────────┘
```

- **窗口 A**：开发者用的，资源管理器里是 `src/extension.ts`、`package.json`。  
- **窗口 B**：F5 后 **自动弹出的新窗口**，你的插件只装在这里。  
- 常见失误：在 **窗口 A** 里找侧边栏图标——那里 **没有**，要去 **窗口 B**。

另有一个 **终端** 跑 `ch28:server`（Agent 大脑），和 A、B 都无关，但要一直开着。

---

### 3.1 终端：起 Agent 服务（在 bagent 仓库根目录）

打开系统终端（或 Cursor 里开一个 Terminal 标签），`cd` 到 **bagent 根目录**（能看到 `package.json`、`lessons/` 的那一层）：

```bash
cd /你的路径/bagent
export DEEPSEEK_API_KEY=sk-...
npm run ch28:server
```

看到类似：

```text
Agent 发布端 http://localhost:3028
POST /chat  body: { "message": "..." }  →  text/event-stream
```

**这个终端不要关**，最小化即可。没有它，侧边栏发消息会连不上。

---

### 3.2 编译插件（仍在 bagent 根目录）

**再开一个终端**（或关掉 server 会断，请用新标签），执行：

```bash
cd /你的路径/bagent
npm run ch30:compile
```

成功会生成 `lessons/30-vscode-extension/out/extension.js`。  
**每次改了 `src/` 里的代码**，都要重新跑这一条，再在窗口 B 里重载（见 3.6）。

---

### 3.3 窗口 A：只打开插件文件夹（重要）

1. 打开 **VS Code 或 Cursor**（若已开着 bagent 整个大仓库，先 **文件 → 关闭文件夹**）。  
2. **文件 → 打开文件夹…**（macOS 也可 **文件 → Open Folder…**）。  
3. 选中 **`bagent/lessons/30-vscode-extension`** 这一层，点打开。  

**不要** 打开整个 `bagent` 根目录——根目录没有本课的 `.vscode/launch.json`，按 F5 会懵。

打开对了的话，左侧资源管理器顶层应是：

```text
30-VSCODE-EXTENSION
  .vscode
  src
  out
  package.json
  …
```

---

### 3.4 按 F5，弹出窗口 B

1. 在 **窗口 A** 按键盘 **F5**（或菜单 **运行 → 启动调试**；左侧「运行和调试」虫子图标 → 选 **「运行第 30 课插件」** → 绿三角）。  
2. 等待几秒，会 **再弹出一个新的编辑器窗口**。  
3. 看新窗口标题，通常带有 **`[Extension Development Host]`** —— 这就是 **窗口 B**。

窗口 A 底部「调试控制台」里若出现 `punycode`、`Claude code extension is now deactivated` 等，多半是 Cursor/别的扩展的日志，**可忽略**，以窗口 B 能不能聊天为准。

---

### 3.5 窗口 B：打开侧边栏并聊天

在 **窗口 B**（不是 A）：

1. 看 **最左侧竖条**（活动栏），点 **对话气泡图标**（鼠标悬停可能显示 bagent）。  
2. 左侧出现面板，标题类似 **BAGENT: AGENT**，顶部有灰字 `需先 npm run ch28:server`。  
3. 底部输入框打字，点 **发送**。  
4. 应出现蓝色「你」气泡、灰色 AI 气泡流式增长；调工具时有 `[工具] read_file(...)`。

找不到图标时：`Cmd+Shift+P`（Mac）或 `Ctrl+Shift+P`（Windows）→ 输入 **`bagent: 打开侧边栏`** → 回车。

效果见上文截图。

---

### 3.6 改代码后怎么刷新

1. 窗口 A 里改 `src/*.ts`  
2. 终端再 `npm run ch30:compile`  
3. 到 **窗口 B** 按 **Cmd+R**（Mac）或 **Ctrl+R**（Win）重载扩展开发宿主  
4. 或关掉窗口 B，回窗口 A 再按一次 F5  

---

### 3.7 一条龙检查清单

- [ ] 终端里 `ch28:server` 在跑  
- [ ] `npm run ch30:compile` 无报错  
- [ ] 窗口 A 打开的是 **`lessons/30-vscode-extension`**，不是整个 bagent  
- [ ] 按 F5 后出现了 **带 [Extension Development Host] 的窗口 B**  
- [ ] 在 **窗口 B** 左侧点了对话图标并发送成功  

---

## 4. 侧边栏怎么和插件主进程说话

```text
Webview（HTML）  --postMessage({type:'ask'})-->  extension.ts
extension.ts     --subscribeChat SSE-->           ch28 server
extension.ts     --postMessage({type:'event'})--> Webview 更新气泡
```

和 [第 26 课](/chapters/26-agent-events) 一样：**事件在 extension 里收到，UI 只负责画**；这里 UI 是 Webview 里的 JS，不是 `terminal.ts`。

---

## 5. 常见问题

| 现象 | 处理 |
|------|------|
| 按 F5 没反应 / 找不到配置 | 是否打开了 **`30-vscode-extension` 文件夹**（见 3.3） |
| 看不到对话图标 | 你在 **窗口 A** 吗？去 **窗口 B**（标题带 Extension Development Host） |
| 发送后 `fetch failed` | 终端是否 `npm run ch28:server`；Key 是否 export |
| 命令面板没有 bagent | 同样要在 **窗口 B** 里按 `Cmd+Shift+P` |
| 改代码没变化 | `ch30:compile` → 窗口 B **Cmd+R** 或重新 F5 |
| 调试控制台一堆 Claude/punycode 警告 | 别的扩展日志，与 bagent 无关 |

---

## 检查点

- [ ] 能说出 Webview 与 extension 主机各干什么吗？  
- [ ] 换主题色为何能跟着 VS Code 变？（用了 `--vscode-*` CSS 变量）  
- [ ] server 要改吗？——不用，仍是 ch28。

---

[← 第 29 课](/chapters/29-agent-split) · [第 31 课 · spawn 子进程](/chapters/31-vscode-spawn) · [第 28 课](/chapters/28-agent-network)
