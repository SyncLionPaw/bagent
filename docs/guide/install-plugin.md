# 安装插件（开箱即用）

不想 clone 仓库、不想 `npm run compile`？从 **GitHub Release** 下载 **bagent** 插件，配好 Key 就能在 Cursor / VS Code 里用完整版 Code Agent（diff 预览 + Accept 写盘）。

[GitHub Releases → 下载最新版](https://github.com/SyncLionPaw/bagent/releases/latest)

固定文件名：**`bagent-plugin.vsix`**（在 Release 资源里）。

---

## 你需要什么

| 项目 | 说明 |
|------|------|
| 编辑器 | [VS Code](https://code.visualstudio.com/) 或 [Cursor](https://cursor.com/) |
| DeepSeek | [API Key](https://platform.deepseek.com/)（必填） |
| Tavily | [API Key](https://tavily.com/)（可选，用于联网搜索） |
| Node | **不需要**（已打进 .vsix） |

---

## 1. 安装 .vsix

**图形界面**

1. 打开 [Releases](https://github.com/SyncLionPaw/bagent/releases/latest)，下载 **`bagent-plugin.vsix`**
2. 扩展面板 → 右上角 **`⋯`** → **从 VSIX 安装…**（Install from VSIX）
3. 选中刚下载的文件

**命令行**

```bash
# Cursor
cursor --install-extension ~/Downloads/bagent-plugin.vsix

# VS Code
code --install-extension ~/Downloads/bagent-plugin.vsix
```

装好后侧边栏会出现 **bagent**（右侧辅助栏），或命令面板搜 **bagent: 打开 Agent 面板**。

---

## 2. 配置 API Key

在终端执行（路径可改）：

```bash
mkdir -p ~/.bagent
echo 'sk-你的DeepSeek密钥' > ~/.bagent/deepseek-api-key
# 可选：联网搜索
echo 'tvly-你的Tavily密钥' > ~/.bagent/tavily-api-key
```

也可以用环境变量（优先于文件）：

```bash
export DEEPSEEK_API_KEY="sk-..."
export TAVILY_API_KEY="tvly-..."
```

插件里输入 `/config` 可查看当前 Key 是否读到。

---

## 3. 开始使用

1. 用 Cursor / VS Code **打开你的项目文件夹**（Agent 的 cwd 即工作区根目录）
2. 打开 bagent 侧栏，像聊天一样提问
3. 改文件时会打开 **diff 预览**；在编辑器标题栏点 **Accept** 才写盘

想从零理解原理、自己改代码 → [第 1 课](/chapters/01-deepseek) 或 [环境准备](/guide/environment) 走完整课程。

---

## 更新插件

到 [Releases](https://github.com/SyncLionPaw/bagent/releases/latest) 下新版 `bagent-plugin.vsix`，再次「从 VSIX 安装」即可覆盖（或先卸载旧版 **bagent**）。

---

## 常见问题

| 问题 | 处理 |
|------|------|
| 侧栏没反应 | 命令面板运行 **bagent: 打开 Agent 面板** |
| 提示找不到 Key | 检查 `~/.bagent/deepseek-api-key` 或 `DEEPSEEK_API_KEY` |
| 没有联网搜索 | 配置 Tavily Key；没有则本地工具仍可用 |
| 想自己改插件源码 | 克隆仓库，跟 [第 53 课](/chapters/53-diff-preview) 用 F5 开发 |
