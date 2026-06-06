# 第 33 课 · 把第 32 课打成 .vsix 插件

**约 30 分钟** · [第 32 课](/chapters/32-vscode-auxiliarybar) 之后

F5 调试和 **装在自己机器上的插件** 不是一回事：

```text
F5（第 30–32 课）     Extension Development Host，改代码 → compile → 重载

.vsix（本课）         一个安装包，扩展面板「从 VSIX 安装」，像装市场插件
```

本课以 [第 32 课](/chapters/32-vscode-auxiliarybar) 为例（右侧辅助栏 + spawn 子进程），打成 **`bagent-lesson32-0.0.2.vsix`**，发给同事或自己重装。

---

## 1. 打包里有什么

`vsce package` 会按 [`.vscodeignore`](/lessons/32-vscode-auxiliarybar/.vscodeignore) 打包，**主要是 `out/`**：

```text
out/extension.js          # 插件入口
out/sidebar.js spawn.js …
out/agent/worker.js       # spawn 的子进程（含 loop / tools）
```

**不会**打进 `src/`、`agent/`（第 32 课里 `agent` 是链到第 31 课的符号链接，必须在 `.vscodeignore` 里排除，否则 `vsce` 会报错）。打进包的是 **`out/agent/*.js`**。所以必须先 **compile**，且 `out/agent/worker.js` 必须存在。

`doc.md`、`image.png` 也不进 vsix（文档站用，插件包不需要）。

Key 文件（`~/.bagent/deepseek-api-key`）**不进** vsix，装好后仍在本机配置。

---

## 2. 一键打包（推荐）

在 **bagent 根目录**：

```bash
# 先保证第 31 课 agent 源码与依赖存在
npm run ch31:compile
npm run ch33:package
```

`ch33:package` 会：

1. 在 `lessons/32-vscode-auxiliarybar` 里 `npm run compile`
2. 临时改 `package.json`（去掉 `private`、加 `publisher: "bagent"`）
3. 跑 `vsce package`
4. **还原** `package.json`（课程仓库仍保持 `private: true`）

成功后当前目录出现：

```text
lessons/32-vscode-auxiliarybar/bagent-lesson32-0.0.2.vsix
```

自定义发布者 ID：

```bash
VSCODE_PUBLISHER=你的id npm run ch33:package
```

---

## 3. 手动打包（看清每一步）

### 3.1 安装 vsce

```bash
npm install -g @vscode/vsce
```

### 3.2 编译

```bash
cd /你的路径/bagent
npm run ch31:compile
npm run ch32:compile
ls lessons/32-vscode-auxiliarybar/out/agent/worker.js   # 必须有
```

### 3.2 改 `package.json`（打包用）

在 `lessons/32-vscode-auxiliarybar/package.json` **临时**：

- 删掉 `"private": true`
- 加上 `"publisher": "bagent"`（上架市场时换成你在 Marketplace 注册的 ID）
- 确认 `"version"` 已递增（每次打包建议改 patch）

可选但推荐已有：`README.md`（本课目录旁 32 课下已有一份）。

### 3.3 执行 package

```bash
cd lessons/32-vscode-auxiliarybar
vsce package --allow-missing-repository
```

打完若改了 `package.json`，**改回** `private: true` 再提交仓库。

---

## 4. 安装 .vsix

### VS Code / Cursor

1. **扩展** 视图 → `…` → **从 VSIX 安装…**
2. 选 `bagent-lesson32-0.0.2.vsix`
3. 按提示 **重新加载窗口**

### 命令行

```bash
code --install-extension lessons/32-vscode-auxiliarybar/bagent-lesson32-0.0.2.vsix
# Cursor 示例：
cursor --install-extension lessons/32-vscode-auxiliarybar/bagent-lesson32-0.0.2.vsix
```

装好后 **不要** 再 F5 本课文件夹；像普通扩展一样用：

- 右侧辅助栏 **bagent** 图标，或  
- `Cmd+Shift+P` → **bagent: 打开右侧 Agent 面板**

仍需本机 `~/.bagent/deepseek-api-key`。

---

## 5. F5 和 .vsix 对比

| | F5 调试 | .vsix 安装 |
|--|---------|------------|
| 窗口 | `[Extension Development Host]` 新窗口 | 当前日常用的窗口 |
| 改代码 | compile + 重载 | 需重新 package + 重装 |
| 路径 | `--extensionDevelopmentPath=本课文件夹` | 解压到 `~/.vscode/extensions/` 等 |
| 适用 | 开发、上课 | 分发、自用固定版本 |

---

## 6. 常见问题

| 现象 | 处理 |
|------|------|
| `Missing publisher` | 打包前加 `"publisher"` 或用 `npm run ch33:package` |
| `private` 不能发布 | 仅 **package** 时要删 private；脚本会自动还原 |
| 装完发消息没反应 | 是否配了 Key；看 **输出 → Log (Extension Host)** |
| vsix 里没有 agent | 先 `ch32:compile`，确认 `out/agent/worker.js` |
| `vsce` 找不到 | `npm install -g @vscode/vsce` 或用 `ch33:package`（自带 npx） |
| `EISDIR` / secret 扫描失败 | `.vscodeignore` 里要有 `agent` 和 `agent/**`（勿把符号链接目录打进包） |
| 和 F5 扩展冲突 | 卸载 VSIX 或不要同时 F5 调试 32 课 |

---

## 7. 可选：上架 Marketplace

本课只到 **.vsix**。若要公开发布：

1. [创建 Publisher](https://marketplace.visualstudio.com/manage)
2. Azure DevOps **Personal Access Token**（Marketplace → Manage）
3. `vsce login <publisher>`
4. `package.json` 加 `repository`、`license`
5. `vsce publish`

教学插件依赖用户自配 DeepSeek / Tavily Key，上架前请在 README 写清楚。

---

## 检查点

- [ ] 能说出 vsix 里主要是 `out/` 哪些文件吗？  
- [ ] 为何 Key 不能打进 vsix？  
- [ ] 改完 32 课代码后，要重装 vsix 还要哪几步？

---

[← 第 32 课](/chapters/32-vscode-auxiliarybar) · [第 31 课](/chapters/31-vscode-spawn)
