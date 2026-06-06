# 第 32 课 · Webview 挂到右侧辅助栏

**约 25 分钟** · [第 31 课](/chapters/31-vscode-spawn) 之后

[第 31 课](/chapters/31-vscode-spawn) 把聊天 Webview 挂在 **左侧活动栏**（`activitybar`）。本课只改 **一行配置**：挂到 **右侧辅助栏**（`secondarySidebar`）——和 Cursor / VS Code 里 **CHAT、Claude Code 所在的那一侧** 同区域，方便并排拖布局。

```text
第 31 课：活动栏图标（左边）  →  bagent 面板

第 32 课：右侧辅助栏图标      →  bagent 面板（可与 Chat 同侧）
```

Agent 仍是 spawn 子进程 + stdio；`agent/` 与第 31 课 **共用**（本目录符号链接）。

---

## 1. 用起来什么样

F5 跑通后，bagent 出现在 **右侧辅助栏**（和 CHAT、Claude Code **同一侧**），大致是这样：

![右侧辅助栏 bagent 与 Chat 同侧](/lessons/32-vscode-auxiliarybar/image.png)

- 标题栏 **`[Extension Development Host]`** = 插件调试窗口 B  
- 右侧竖条顶部可见 **CHAT · CLAUDE CODE · BAGENT: AGENT** 等 Tab（因 IDE 版本而异）  
- **BAGENT: AGENT** 里灰字：`右侧辅助栏 secondarySidebar · spawn 子进程 · 可拖到 Chat 旁边`  
- 聊天气泡、`[工具] get_time` / `web_search` 与第 31 课相同，只是 **挂载位置** 变了  

---

## 2. 和第 31 课差在哪

| | 第 31 课 | 第 32 课（本课） |
|--|----------|------------------|
| 挂载点 | `viewsContainers.activitybar` | **`viewsContainers.secondarySidebar`** |
| 面板位置 | 左侧活动栏 | **右侧辅助栏**（Secondary Side Bar） |
| 与 Chat | 不同侧 | **可与 CHAT / CLAUDE CODE 同侧** |
| 内核 | spawn + stdio | **相同**（链到 31 的 `agent/`） |

**进不了** CHAT 顶部的 `CHAT | CLAUDE CODE` Tab 栏（那是产品内置位）；本课是 **旁边多一个 bagent 图标**，用户自己拖宽度。

---

## 3. 唯一必改：`package.json`

第 31 课：

```json
"viewsContainers": {
  "activitybar": [{ "id": "bagent31", "title": "bagent", "icon": "$(comment-discussion)" }]
}
```

本课：

```json
"viewsContainers": {
  "secondarySidebar": [{ "id": "bagent32", "title": "bagent", "icon": "$(comment-discussion)" }]
}
```

**不要写 `auxiliarybar`**——那不是合法 contribution key，容器不会被创建，只会报警：

```text
View container 'bagent32' does not exist … added to 'Explorer'
```

官方 key 只有三个：`activitybar`、`panel`、`secondarySidebar`（右侧辅助栏）。需要 **VS Code 1.94+**（或较新的 Cursor）。

`views`、`webview` id 换成 `bagent32`；命令 **`bagent: 打开右侧 Agent 面板`** 会聚焦辅助栏并打开 Agent 视图。

---

## 4. 目录

```text
lessons/32-vscode-auxiliarybar/
  package.json          # secondarySidebar + bagent32
  src/
    extension.ts        # + workbench.action.focusAuxiliaryBar
    sidebar.ts            # 灰字提示 secondarySidebar
    apiKey.ts spawn.ts events.ts  → 链接到第 31 课
  agent/                  → 链接到第 31 课
```

---

## 5. 动手

Key 文件、spawn 逻辑与 [第 31 课 §5](/chapters/31-vscode-spawn#_5-动手零基础版) 相同（`~/.bagent/deepseek-api-key` 等）。F5 双窗口流程也相同，只是 **打开本课文件夹**。

### 5.1 编译

```bash
cd /你的路径/bagent
npm run ch32:compile
```

（复用第 31 课 `node_modules`，不重复 `npm install`。）

### 5.2 打开并 F5

```bash
cd lessons/32-vscode-auxiliarybar
code .
```

**F5** → 在 **窗口 B** 看 **右侧**（不是左侧活动栏）：

1. 若辅助栏未显示：**查看 → 外观 → 辅助栏**（或 `Cmd+Option+B` / 命令面板 **Toggle Secondary Side Bar**）  
2. 点右侧竖条上的 **对话图标**（bagent）  
3. 或 `Cmd+Shift+P` → **`bagent: 打开右侧 Agent 面板`**

### 5.3 和 Chat 并排

1. 点标题栏 **气泡 / Toggle Chat**，打开 **CHAT** 或 **CLAUDE CODE**  
2. 再点辅助栏 **bagent** 图标，或运行 **`bagent: 打开右侧 Agent 面板`**  
3. 拖动两个面板之间的分隔条调宽度  

理想布局：**左写代码 · 右侧 CHAT 与 BAGENT 并排**（见上文截图）。

### 5.4 检查清单

- [ ] `package.json` 里是 **`secondarySidebar`**（不是 `auxiliarybar` / `activitybar`）  
- [ ] `npm run ch32:compile` 成功  
- [ ] 打开的是 **`32-vscode-auxiliarybar`** 文件夹  
- [ ] 在 **窗口 B 右侧** 能找到 bagent 并聊天  
- [ ] 能与 Chat 面板同侧并排（手动拖布局）

---

## 6. `extension.ts` 多做的事

```text
bagent32.open
  → workbench.action.focusAuxiliaryBar   # 先打开/聚焦右侧辅助栏
  → bagent32.chat.focus                  # 再聚焦 Agent Webview
```

---

## 7. 常见问题

| 现象 | 处理 |
|------|------|
| `View container 'bagent32' does not exist` | 把 `auxiliarybar` 改成 **`secondarySidebar`**，重新 compile + F5 |
| 只在左边找到图标 | 你跑的是第 **31** 课；或容器掉进了 Explorer（见上条） |
| 右侧是空的 | 打开辅助栏；运行 **bagent: 打开右侧 Agent 面板** |
| compile 报错找不到 agent | 先 `npm run ch31:compile` 一次，保证 31 课 `agent/` 存在 |
| 想和 CHAT 同一个 Tab | 做不到；见 [第 31 课](/chapters/31-vscode-spawn) 末「和 Claude Code 的关系」 |

---

## 检查点

- [ ] `activitybar` 和 `secondarySidebar` 在界面上分别在哪一侧？  
- [ ] 为何本课几乎不用改 `spawn.ts` / `agent/`？  
- [ ] 若改回左侧，要改 package.json 哪一处？

---

[← 第 31 课](/chapters/31-vscode-spawn) · [第 33 课 · 打包 VSIX](/chapters/33-vscode-vsix) · [第 30 课](/chapters/30-vscode-extension)
