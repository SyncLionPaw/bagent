# 第 46 课 · 用户消息 Reminder 注入

**约 30 分钟** · [第 45 课](/chapters/45-web-search) 之后 · **独立插件**

长对话里，模型容易「忘掉」系统提示里的细节：该用 `ask_user_question` 时却在正文里盘问、路径写成相对路径、该等审批时自作主张。本课在 [第 45 课](/chapters/45-web-search) 能力之上，增加 **reminder 注入**——把关键规则悄悄附在每条发往 API 的用户消息后面，用户界面仍只显示原文。

---

## 1. 思路

| 层 | 存什么 | 用户看到什么 |
|----|--------|--------------|
| `history` | 干净的用户原文 | — |
| 发往 LLM 的 payload | 原文 + `<reminder>…</reminder>` | 模型读到规则 |
| 侧边栏 / webview | 同 `history`（再经 `stripReminder` 兜底） | 只有原文 |

标签形如：

```xml
<reminder>
1. 不要使用markdown语法，使用纯文本
2. 缺关键信息才能继续任务时，必须用 ask_user_question …
3. 保持简洁…
4. 不要透露敏感信息…
</reminder>
```

模型会把 `<reminder>` 当作本轮补充约束；用户输入框与气泡里不会出现这段文字。

---

## 2. 注入时机

`agent/stream.ts` 在 `fetch` 前调用 `messagesForApi(history)`：

- `history` 里每条 `user` 消息保持用户输入的原样（`loop.ts` 的 `push` 不改写）。
- 仅 **当前轮最新一条** `user` 消息在构建 API `messages` 时调用 `augmentUserMessage()`。
- 同一轮里若模型连续调工具、多次请求 API，每次都会给这条 user 消息重新附上 reminder，减轻中途「跑偏」。

---

## 3. 代码位置

| 文件 | 作用 |
|------|------|
| `agent/system.ts` | `BEHAVIOR_RULES`（四条行为准则，system 与 reminder 共用） |
| `agent/reminder.ts` | `augmentUserMessage()`、`stripReminder()` |
| `agent/plan.ts` | `plan_operate`：`~/.bagent/{项目名}/{name}.md` 待办清单 |
| `agent/stream.ts` | `messagesForApi()`，仅 API 路径注入 |
| `src/utils/reminder.ts` | 扩展进程侧 `stripReminder()`（与 agent 逻辑一致） |
| `src/sidebar.ts` | webview 展示前去掉 `<reminder>` 块（安全网） |

reminder 正文与 `system.ts` 里 `BEHAVIOR_RULES` 完全相同（上述四条）；工具说明、路径与审批仍只在 system 里写一次，不重复进 reminder。

---

## 4. 与第 45 课关系

- **第 45 课**：联网、`ask_user_question`、只读自动放行
- **第 46 课**：fork 45 + reminder 注入；**不修改** 40 / 44 / 45

其余工具、审批、追问流程与第 45 课相同。本课另增 **`plan_operate`**：Agent 可把多步任务写成 Markdown 待办，落在 **`~/.bagent/{项目名}/{name}.md`**（与 `deepseek-api-key` 等同在用户目录，**不在**工作区里建 `.bagent`）。`{项目名}` 为当前 cwd 目录名的安全化形式；**`name`** 区分同一项目下的多份计划（如 `refactor-auth`、`fix-bug-42`）。

| method | 作用 |
|--------|------|
| `read` | 读取当前计划（返回 `todos` / `markdown`）；`content` 可空 |
| `new` / `replace` | 整表写入或重写该 `name` 的计划 |
| `update` | 合并：`- [x]` 勾选、增补新行、`- [-] 条目` 删除该项 |
| `delete` | `content` 为空删文件；否则按条目文本删除 |

改计划前应先 **`read`**；大改条目用 **`replace`** 整表重写，小改用 **`update`**。

`content` 可为完整 Markdown，或每行一条待办（自动补成 `- [ ] …`）。写入 `~/.bagent` 由 Agent 自管，**自动放行**，不走 `write_file` 审批。

**UI**：`plan_operate` 成功后额外发出 `PlanUpdated` 事件；侧边栏渲染待办卡片（勾选状态、进度条 `done/total`），不再把 JSON 工具结果当普通一行刷出来。终端 `npm run ch46` 同样打印清单与进度。

![计划卡片与 web_search](/lessons/46-reminder-injection/image1.png)

多步任务里 `refine-summer-plan` 计划卡片：**1/6** 进度、条目勾选；`web_search` 绿边自动放行；思考块折叠在正文上方。计划落在 `~/.bagent/{项目名}/`，不污染工作区。

![ask_user_question 与联网追问](/lessons/46-reminder-injection/image2.png)

同一轮对话更早片段：用户说「再加一个清迈的行程」，Agent 用 **`ask_user_question`** 卡片追问（非正文盘问），用户答「有」后再 **`web_search`**；左侧编辑器里是 `write_file` 写出的 `summer-plan.md`。

---

## 5. VS Code 动手

```bash
npm run ch46:compile
```

1. 打开 **`lessons/46-reminder-injection`** → **F5**
2. `bagent: 打开 Agent 面板（第 46 课）`
3. 多轮对话后，观察模型是否仍倾向用 `ask_user_question`、绝对路径
4. 确认聊天气泡里没有 `<reminder>` 字样

调试 API 时可在 `messagesForApi` 处打日志，对比 `history` 与发往 DeepSeek 的 `messages`。

---

## 6. 终端动手

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch46
```

终端同样走 `streamEvents` → `messagesForApi`，注入行为与插件一致。

---

## 检查点

- [ ] `history` 里 user 消息无 `<reminder>`？
- [ ] 每次 API 请求里最新 user 消息带 reminder？
- [ ] 侧边栏用户气泡不显示 reminder 块？
- [ ] 多轮工具调用后模型仍遵守追问 / 路径规则？
- [ ] 多步任务时 Agent 会用 `plan_operate`（带 `name`），且 `~/.bagent/…/{name}.md` 为 Markdown 待办？
- [ ] 侧边栏出现计划卡片，能看到条目勾选与 `done/total` 进度？

---

[← 第 45 课](/chapters/45-web-search)
