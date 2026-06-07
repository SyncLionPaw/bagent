# 第 101 课 · VS Code 插件是什么？怎么开发？

**约 25 分钟** · 纯阅读 · 扩展阅读

本文介绍 **VS Code 插件**：编辑器是什么、插件是什么、**从零到跑起来**大致走哪些步骤。  
动手做一个完整小插件（计算器）见 [第 102 课](/chapters/102-vscode-calculator)。

---

## 1. VS Code 本质上是什么

你桌面上的 **VS Code**，和 **Slack 桌面版、Figma 桌面版** 是一类程序：

> **用 Electron 做的跨平台桌面 App。**

Electron 把两样东西捆在一起：

- **Chromium** — 负责画界面（内嵌的浏览器引擎）  
- **Node.js** — 负责读文件、起子进程、访问网络  

所以 VS Code 里你看到的 **编辑器、侧边栏、菜单、主题**，大部分是用 **HTML / CSS / JavaScript** 画出来的；插件若要 **读硬盘、访问工作区**，走的是 **Node** 那一侧。

**VS Code 是一个用 JS 技术栈写的桌面程序**，不是改不了的 C++ 黑盒。

---

## 2. 插件是什么

VS Code 允许你 **额外装一包 JavaScript**，在运行时挂上去：

> **插件 = 一段 JS/TS + 一份清单（`package.json`），告诉 VS Code「加载我、并在界面上给我一块位置」。**

| | |
|--|--|
| Chrome | 浏览器本体 + 你装的扩展 |
| VS Code | 编辑器本体 + 你写的 `extension.js` |

**常见能力**（官方 API，如 `vscode.window`、`vscode.workspace`）：

- 命令面板里 **加一条命令**  
- 左侧 **加图标和面板**  
- **读、改**工作区文件  
- 在面板里嵌 **Webview**（一块 HTML 小页面）  

**做不到**：改 VS Code 源码；在 Webview 里随意读任意磁盘路径（须经 extension 转发）。

用户安装方式：扩展市场，或 **「从 VSIX 安装…」**。

---

## 3. 一个插件项目长什么样

典型目录（TypeScript）：

```text
my-extension/
  package.json       ← 插件说明书：入口、贡献点、版本
  tsconfig.json
  src/
    extension.ts     ← 入口：activate / deactivate
  out/
    extension.js     ← 编译结果；VS Code 实际加载这个
```

和 Node 小项目相同：`npm install`、`npm run compile`。多出来的是：

1. 依赖 **`@types/vscode`**  
2. `package.json` 里的 **`contributes`**（往 UI 上挂什么）  
3. 代码里 **`import * as vscode from "vscode"`**

---

## 4. 开发流程（大致顺序）

```text
① 脚手架生成项目
        ↓
② 在 package.json 的 contributes 里声明命令 / 侧边栏 / 配置…
        ↓
③ 在 extension.ts 的 activate() 里注册对应行为（与 contributes 的 id 一致）
        ↓
④ npm run compile（src → out）
        ↓
⑤ 用 VS Code 打开项目文件夹，按 F5 → 在新窗口里试
        ↓
⑥ 改代码 → 再 compile → Reload Window
        ↓
⑦ 可选：加 Webview、加设置项、读工作区文件…
        ↓
⑧ 满意后 vsce package 打成 .vsix，或 publish 到市场
```

下面逐步说明。

### 4.1 脚手架

安装 [VS Code](https://code.visualstudio.com/) 和 Node.js，然后：

```bash
npm install -g yo generator-code
yo code
```

选 **New Extension (TypeScript)**。会生成 `package.json`、`src/extension.ts`、`.vscode/launch.json`（F5 调试配置）。

### 4.2 两份清单要对上号

**`package.json` → `contributes`**：声明「界面上有什么」。例如一条命令：

```json
"contributes": {
  "commands": [
    { "command": "myExt.hello", "title": "My Ext: Hello" }
  ]
}
```

**`extension.ts` → `activate()`**：声明「点了之后干什么」。例如：

```typescript
export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand("myExt.hello", () => {
    vscode.window.showInformationMessage("Hello!");
  });
  context.subscriptions.push(cmd);
}
```

`contributes` 里的 `command` 字符串必须和 `registerCommand("myExt.hello", …)` **完全一致**。  
`context.subscriptions.push` 用于插件卸载时自动清理。

`package.json` 的 `"main": "./out/extension.js"` 指向 **编译后的** 入口。

### 4.3 编译

```bash
npm install
npm run compile
```

改 `src/` 后都要重新 compile（或开 `watch` 脚本）。

### 4.4 F5 调试：两个窗口

```text
窗口 A — 打开插件源码的工作台
    按 F5
        ↓
窗口 B — 标题含 [Extension Development Host]
         插件只在这里加载
```

**试功能去窗口 B**，不要在窗口 A 里找新命令。

改完代码：`npm run compile` → 窗口 B **Developer: Reload Window**，或重新 F5。

### 4.5 Webview（需要自定义界面时）

复杂 UI（按钮盘、表单、预览）常用 **Webview**：在侧边栏或标签页里塞 **HTML + CSS + JS**。

- **`extension.ts`**：注册 Webview，处理 `postMessage`，能访问 `vscode` API  
- **Webview 内 `<script>`**：画界面；用 `acquireVsCodeApi().postMessage(...)` 和 extension 通信  

界面像网页；敏感操作仍由 extension 执行。

### 4.6 打包分发

| 阶段 | 说明 |
|------|------|
| F5 | 开发窗口临时加载 |
| `vsce package` | 生成 `.vsix` 安装包 |
| `vsce publish` | 发布到扩展市场 |

```bash
npm install -g @vscode/vsce
vsce package
```

打进 `.vsix` 的是 **`out/`** 等运行文件，不是 `src/`。

---

## 5. Extension Host（一句话）

VS Code 把插件 JS 放在 **单独一块运行时**（Extension Host）里跑，避免插件拖垮整个界面。你的 `extension.ts` 跑在这一层。

---

## 6. 插件常见「挂点」

| 挂点 | 用户看到 |
|------|----------|
| Command | 命令面板（`Cmd+Shift+P`）多一条 |
| Activity Bar + View / Webview | 左侧多一个图标和面板 |
| Status Bar | 窗口右下角 |
| Configuration | 设置里多几项 |
| 补全 / Hover / 诊断 | 编辑文字时出现 |

第一个插件通常从 **Command + 弹窗** 或 **侧边栏 Webview** 开始。

---

## 7. 进一步阅读

- 本仓库动手课：[第 102 课 · 计算器插件](/chapters/102-vscode-calculator)（`lessons/102-vscode-calculator/`，`npm run ch102:compile` 后 F5）
- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)  
- [Extension API 总览](https://code.visualstudio.com/api/references/vscode-api)  
- [Webview 指南](https://code.visualstudio.com/api/extension-guides/webview)  
- [发布扩展](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)  

---

## 检查点

- [ ] VS Code 和 Electron 是什么关系？  
- [ ] 插件是在改 VS Code 源码吗？  
- [ ] 开发流程里，`contributes` 和 `activate()` 各负责什么？  
- [ ] 为什么改 `src/` 后要 compile？  
- [ ] F5 之后为什么要去第二个窗口试？  

---

[第 102 课 · 计算器插件](/chapters/102-vscode-calculator)
