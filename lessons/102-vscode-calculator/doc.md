# 第 102 课 · 动手：VS Code 计算器插件

**约 45 分钟** · 扩展阅读 · [第 101 课](/chapters/101-vscode-extension) 之后

[第 101 课](/chapters/101-vscode-extension) 讲了插件开发流程。  
本课仓库里已备好 **可运行的计算器插件**，包含：

- **命令**：`Cmd+Shift+P` → `Calculator: 计算算式` → 输入 `(1+2)*3`  
- **侧边栏 Webview**：左侧 **数字图标** → 按钮盘 + 显示屏  

---

## 1. 目录

```text
lessons/102-vscode-calculator/
  .vscode/launch.json    # F5 调试
  package.json
  src/
    extension.ts         # 注册命令 + 侧边栏
    panel.ts             # Webview 按钮盘
    eval.ts              # 求值（命令与 Webview 共用）
  out/                   # compile 后生成
```

---

## 2. 用起来什么样

**方式 A — 命令**

1. 窗口 B 按 `Cmd+Shift+P`（Windows：`Ctrl+Shift+P`）  
2. 输入 **Calculator: 计算算式**  
3. 输入 `3*14` → 弹出 `= 42`  

**方式 B — 侧边栏**

1. 窗口 B 左侧活动栏点 **数字图标**（Calculator）  
2. 点按钮拼算式，点 **=** → 结果显示在显示屏上  

找不到侧边栏时：命令面板 → **Calculator: 打开侧边栏**。

---

## 3. 动手步骤

### 3.1 编译

在 **bagent 根目录**：

```bash
npm run ch102:compile
```

或在课目录内：

```bash
cd lessons/102-vscode-calculator
npm install
npm run compile
```

### 3.2 打开正确的文件夹（重要）

1. **文件 → 打开文件夹…**  
2. 选中 **`lessons/102-vscode-calculator`**（不是整个 bagent 根目录）  

资源管理器顶层应类似：

```text
102-VSCODE-CALCULATOR
  .vscode
  src
  out
  package.json
```

### 3.3 F5 → 窗口 B

1. 按 **F5**（或 **运行 → 启动调试**，选「运行第 102 课计算器插件」）  
2. 弹出标题带 **`[Extension Development Host]`** 的新窗口 → 这是 **窗口 B**  
3. 在 **窗口 B** 试命令或侧边栏（不是写代码的窗口 A）

### 3.4 改代码后

1. 再 `npm run ch102:compile`  
2. 窗口 B：**Developer: Reload Window**，或重新 F5  

---

## 4. 代码怎么串起来

```text
命令 calculator.eval
  → extension.ts → eval.ts → 弹窗显示结果

Webview 点 =
  → postMessage({ type: "eval", expr })
  → panel.ts → eval.ts
  → postMessage({ type: "result", value }) 回 Webview
```

`package.json` 里 `calculator.panel` 与 `registerWebviewViewProvider("calculator.panel", …)` 的 id 一致。

---

## 5. 核心文件说明

### `eval.ts`

只允许数字与 `+ - * / ( ) .` 等字符，再求值。教程示例，勿用于不可信输入。

### `extension.ts`

注册命令与 Webview；`calculator.focus` 用于命令面板打开侧边栏。

### `panel.ts`

`getHtml()` 返回内联 HTML/CSS/JS；`onDidReceiveMessage` 处理求值并回传结果或错误。

---

## 6. 打包（可选）

```bash
cd lessons/102-vscode-calculator
npm install -g @vscode/vsce
vsce package
```

扩展面板 **从 VSIX 安装…** 安装生成的 `.vsix`。

---

## 检查点

- [ ] `npm run ch102:compile` 无报错？  
- [ ] 打开的是 **`102-vscode-calculator` 文件夹**，不是 bagent 根？  
- [ ] 在 **窗口 B** 试命令 `(2+3)*4` 得 `20`？  
- [ ] 侧边栏按钮盘点 **=** 能显示结果？  
- [ ] Webview 里谁负责算、`extension.ts` 和 `<script>` 各干什么？  

---

[← 第 101 课](/chapters/101-vscode-extension)
