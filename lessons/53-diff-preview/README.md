# bagent

<p align="center">
  <img src="media/icon.png" width="128" height="128" alt="bagent" />
</p>

**bagent** = **bag** + **agent** — 背在编辑器侧边栏里的 Code Agent。读文件、改代码、跑命令；危险操作会请你确认，改文件前先看 **diff**，点 **Accept** 才写盘。

## 功能

- 侧边栏对话，以当前工作区为项目根目录
- 工具：`read_file`、`write_file`、`str_replace`、`delete_file`、`run_command`、`web_search`（需 Tavily Key）等
- 编辑提案在 `vscode.diff` 中预览，标题栏 **Accept** / **Reject**
- 终端命令、部分工具调用可在侧栏确认

## 安装

从 [GitHub Releases](https://github.com/SyncLionPaw/bagent/releases/latest) 下载 **`bagent-plugin.vsix`**，在 VS Code / Cursor 中：

**扩展** → **⋯** → **从 VSIX 安装…**

或命令行：

```bash
cursor --install-extension bagent-plugin.vsix
# code --install-extension bagent-plugin.vsix
```

## 配置

默认从文件读取 API Key（也可用环境变量，优先于文件）：

```bash
mkdir -p ~/.bagent
echo 'sk-你的DeepSeek密钥' > ~/.bagent/deepseek-api-key
# 可选：联网搜索
echo 'tvly-你的Tavily密钥' > ~/.bagent/tavily-api-key
```

| 设置项 | 默认 |
|--------|------|
| `bagent53.apiKeyPath` | `~/.bagent/deepseek-api-key` |
| `bagent53.tavilyApiKeyPath` | `~/.bagent/tavily-api-key` |

侧栏输入 `/config` 可检查 Key 是否读到。

## 使用

1. 用编辑器 **打开项目文件夹**
2. 右侧辅助栏打开 **bagent**，或命令面板运行 **bagent: 打开 Agent 面板**
3. 像聊天一样描述任务；Agent 提议改文件时会打开 diff，确认后再写盘

## 文档

- 安装说明：<https://synclionpaw.github.io/bagent/guide/install-plugin>
- 课程与源码：<https://synclionpaw.github.io/bagent/>
- 仓库：<https://github.com/SyncLionPaw/bagent>

## 许可

与 [bagent 仓库](https://github.com/SyncLionPaw/bagent) 相同。
