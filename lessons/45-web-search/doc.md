# 第 45 课 · 动态联网与用户追问

**约 40 分钟** · [第 44 课](/chapters/44-read-dispatch) 之后 · **独立插件**

本课在 [第 44 课](/chapters/44-read-dispatch) 上增加三块能力：

1. **动态 `web_search`**（Tavily，有 Key 才注册）
2. **只读工具自动放行**（合规 `stat_file` / `read_file` 等）
3. **`ask_user_question`**（向用户追问，专用事件 + 等待输入）

---

## 1. 动态 web_search

[第 9 课](/chapters/09-tavily) 起就有 `web_search`，但若写死在 `toolDefinitions` 里，没 Key 时模型仍会白调一轮。

| 机制 | 作用 |
|------|------|
| `hasWebSearch()` | 读 `TAVILY_API_KEY` |
| `getToolDefinitions()` | 有 Key 才追加 `web_search` |
| `getPluginSystem()` | 提示里说明是否可联网 |

Tavily **Search**（本课 `web_search`）按关键词搜；**Extract**（按 URL 抓正文）尚未实现，以后可加 `fetch_url`。

配置 Key：`~/.bagent/tavily-api-key` 或 `export TAVILY_API_KEY=tvly-...`，设置项 **`bagent45.tavilyApiKeyPath`**。

---

## 2. 只读工具自动放行

| 工具 | 自动放行 |
|------|----------|
| `pwd` | ✅ |
| `ls` / `stat_file` / `read_file` / `grep` | ✅ cwd 下且非 `.git` / `node_modules` / `.env` |
| `write_file` / `web_search` / `ask_user_question` | ❌ |

`ask_user_question` 不走审批条，见下一节。自动放行在工具行尾显示绿色 **· 自动放行**，不单独占一行。

---

## 3. ask_user_question（用户追问）

当 Agent **缺关键信息**且项目里读不到时，可调用：

```json
{ "question": "你要部署到哪个环境：staging 还是 production？" }
```

### 流程

```
模型 tool_call ask_user_question
  → loop 发 ToolCallStart
  → loop 发 AskUserPending（UI 显示问题 + 输入框 +「跳过」）
  → worker 等待 stdin：ask_user_answer / ask_user_skip
  → 写入 tool 结果，继续 Agent 循环
```

与 [第 35 课](/chapters/35-tool-approval) **审批**不同：这是**问答**，不是允许/拒绝执行。

### 工具返回

用户**提交**：

```json
{ "ok": true, "answer": "staging" }
```

用户**跳过**（或终端直接回车）：

```json
{
  "ok": false,
  "hint": "用户不想填写此次信息补充，请你自行决定"
}
```

Agent 应读 `hint` 后**自己想办法**，不要反复追问同一件事。

系统提示要求：**需要用户指定文件名、二选一等时，必须调 `ask_user_question`，禁止在正文里用「你想看哪个文件」代替。**

### 代码位置

| 文件 | 作用 |
|------|------|
| `agent/askUser.ts` | 解析问题、格式化返回、`AskUserTool` 类型 |
| `agent/loop.ts` | 专用分支，不经过 `runTool` / 审批 |
| `agent/worker.ts` | `op: ask_user_answer` / `ask_user_skip` |
| `src/spawn.ts` | `answerAskUser()` / `skipAskUser()` |
| `src/sidebar.ts` | `AskUserPending` 追问卡片 |

---

## 4. 文件一览

| 文件 | 作用 |
|------|------|
| `agent/tavily.ts` | Tavily 搜索 |
| `agent/autoApprove.ts` | 只读自动放行 |
| `agent/askUser.ts` | 用户追问 |
| `agent/tools.ts` | `getToolDefinitions()` |
| `agent/system.ts` | `getPluginSystem()` |
| `src/extension.ts` | Key 注入子进程 |

---

## 5. VS Code 动手

```bash
npm run ch45:compile
```

1. 打开 **`lessons/45-web-search`** → **F5**
2. `bagent: 打开 Agent 面板（web_search）`
3. `/config` 看联网状态
4. 试一句会触发澄清的问题，例如：「帮我在项目里加一个部署脚本」（观察是否 `ask_user_question`）
5. 分别试 **提交** 与 **跳过**

---

## 6. 终端动手

```bash
export DEEPSEEK_API_KEY=sk-...
export TAVILY_API_KEY=tvly-...   # 可选
npm run ch45
```

追问时终端会打印 `[追问] …`，回车即跳过。

---

## 7. 与第 44 课关系

- **第 44 课**：读文件分发
- **第 45 课**：fork 44 + 联网 + 自动放行 + 用户追问；**不修改** 40 / 44

---

## 检查点

- [ ] 无 Tavily Key 时工具列表无 `web_search`？
- [ ] `read_file` 读 cwd 下普通文件自动放行？
- [ ] `ask_user_question` 出现追问 UI，跳过返回 hint？
- [ ] 跳过后 Agent 是否继续任务、不死循环追问？

---

[← 第 44 课](/chapters/44-read-dispatch) · [第 9 课 · Tavily](/chapters/09-tavily)
