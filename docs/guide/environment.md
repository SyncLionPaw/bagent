# 环境准备

只想**用插件、不想搭开发环境**？看 **[安装插件](/guide/install-plugin)**：下载 Release 里的 `bagent-plugin.vsix`，配 DeepSeek / Tavily Key 即可。

下面是从头**学课程、跑示例**的环境要求。主线 **Node.js**；**第 12、14 课**用 Python（transformers / FastAPI）。

| 项目 | 要求 |
|------|------|
| Node.js | **20+**（内置 `fetch`） |
| npm | 仓库根目录 `npm install` |
| 第 1 课 | `DEEPSEEK_API_KEY`（`export` 或 `~/.bagent/deepseek-api-key`） |
| 第 9 课 | `TAVILY_API_KEY`（[Tavily](https://docs.tavily.com/welcome)） |
| 第 12 课 | Python **3.10+**；`npm run ch12:setup:cpu` 或 `ch12:setup:cuda` |
| 第 14 课 | Python **3.10+**（假数据 SSE，无需 Key） |
| 第 30–33、40–53 课 | [VS Code](https://code.visualstudio.com/) 或 Cursor；开发用 **F5**，或装 **.vsix**（见下） |
| 第 31 课插件 | DeepSeek / Tavily Key 见上；读 `~/.bagent/` |

## 命令速查

```bash
npm install
export DEEPSEEK_API_KEY="sk-..."
export TAVILY_API_KEY="tvly-..."   # 第 9 课

# 第一阶段 1–10
npm run ch01 … ch10

# 第二阶段 11–21
npm run ch11
npm run ch12:setup:cpu && npm run ch12
npm run ch14:setup && npm run ch14:server   # 终端 1
npm run ch14                                # 终端 2
npm run ch15:hand && npm run ch15:parser
npm run ch18 && npm run ch19 && npm run ch20

# 第三阶段 22–36（TypeScript，tsx）
npm run ch22 && npm run ch23
npm run ch24 && npm run ch25 && npm run ch26
npm run ch28:server    # 终端 1
npm run ch28:client    # 终端 2
npm run ch34 && npm run ch35 && npm run ch36

# VS Code 插件（先 compile，再打开课目录 F5）
npm run ch30:compile
npm run ch31:compile
npm run ch32:compile   # 需先 ch31:compile
npm run ch33:package   # 第 32 课 → .vsix
npm run ch53:package   # 当前完整插件（diff 写盘）→ .vsix
npm run ch40:compile   # 第 40 课：ch36 内核 + 审批 Webview
npm run ch102:compile  # 第 102 课计算器 demo

# 从 VSIX 安装（无需 compile / F5）
# 扩展 ⋯ → 从 VSIX 安装… → bagent-lesson53-0.0.1.vsix
# 或：cursor --install-extension lessons/53-diff-preview/bagent-lesson53-0.0.1.vsix

# 文档站本地预览
npm run dev            # http://localhost:5173/bagent/
npm run build          # 发布前检查 dead link
```

[第 1 课 →](../chapters/01-deepseek) · [第 40 课 插件对齐 ch36 →](../chapters/40-vscode-kernel-upgrade)
