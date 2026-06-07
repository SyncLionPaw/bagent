# 第 42 课 · 模型列表（/models）

**约 30 分钟** · [第 40 课](/chapters/40-vscode-kernel-upgrade) 之后 · 插件 UI + 独立 utils

---

## 0. 为什么单独做 utils？

[第 40 课](/chapters/40-vscode-kernel-upgrade) 的 worker 写死 `deepseek-v4-flash`。产品里用户要能 **看有哪些模型、切换当前模型**。

两件事：

1. **UI**：工具栏「模型列表」按钮  
2. **斜杠命令**：输入 `/models`、`/model <id>`

拉模型列表要走 DeepSeek `GET /models`，和 Agent Loop 无关。把它放进 **`src/utils/`**，插件和终端脚本共用，避免塞进 `sidebar.ts` 或 worker。

```text
Webview 按钮 / 输入 /models
  → Extension（有 API Key）
  → utils/models.ts  fetch 列表
  → 系统消息气泡展示

/model deepseek-chat
  → utils/slash.ts 解析
  → spawn set_model → worker 更新 DEEPSEEK_MODEL
  → 下一轮 stream 用新模型
```

---

## 1. utils 模块

| 文件 | 职责 |
|------|------|
| `src/utils/models.ts` | `listModels(apiKey)`、`formatModelList()`、`DEFAULT_MODEL` |
| `src/utils/balance.ts` | `fetchBalance(apiKey)`、`formatBalance()` — [DeepSeek 查询余额](https://api-docs.deepseek.com/zh-cn/api/get-user-balance) |
| `src/utils/config.ts` | `formatConfig()`、`maskApiKey()` — 本地配置摘要 |
| `src/utils/slash.ts` | `parseSlashCommand()`、`slashHelpText()` |

**不走 Agent**：`/models` 在 `sidebar.ts` 里拦截，**不**写入 `history`，不消耗一轮对话。

---

## 2. 插件 UI

| 入口 | 行为 |
|------|------|
| 输入框左侧 **列表图标** | `postMessage({ type: "listModels" })` |
| 输入 `/models` 或 `/model` | 与按钮相同，日志里保留你的用户气泡 |
| 输入 `/model <id>` | 切换模型，顶栏 hint 更新，系统消息确认 |
| `/balance` 或 `/bal` | `GET /user/balance`，展示总可用 / 赠金 / 充值（不进 history） |
| `/config` | 当前模型、cwd、Key 来源与脱敏预览（不打印完整 Key） |
| `/help` | 列出全部斜杠命令 |
| 普通问题 | 与第 40 课相同，走 worker `chat` |

顶栏灰字示例：`模型：deepseek-v4-flash · /models 列表 · /model <id> 切换`

---

## 3. worker 侧

新增 stdio 操作（仅本课）：

```json
{ "op": "set_model", "model": "deepseek-chat" }
```

`agent/stream.ts` 读取：

```typescript
model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash"
```

[ch36 终端内核](/chapters/36-tool-hooks) 的 `stream.ts` 同样支持 `DEEPSEEK_MODEL` 环境变量，终端课也能切换。

---

## 4. 目录

```text
lessons/42-model-list/
  src/
    utils/models.ts
    utils/slash.ts
    sidebar.ts          # 拦截斜杠 + 模型按钮
    spawn.ts            # setModel()
    extension.ts
  agent/                # 继承 ch40 内核 + set_model
  chat.ts               # 终端：/models、/model
  doc.md
```

---

## 5. 动手

```bash
cd /Users/gongyulei/bagent
npm run ch42:compile
cd lessons/42-model-list
code .
```

1. **F5** → 右侧 bagent 面板  
2. 点 **列表图标** 或输入 `/models` → 应出现可用模型列表，当前模型标 `← 当前`  
3. `/model deepseek-chat`（或 API 返回的其它 id）→ hint 与系统消息更新  
4. `/balance` → 显示账户余额与是否可调用  
5. 再问普通问题 → 使用新模型发请求  

**终端**（无需 F5）：

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch42
# /models  /model deepseek-chat
```

---

## 6. 检查点

1. 为什么模型列表在 Extension 拉，而不是 worker？（Key 在宿主、不必进 history）  
2. `/models` 和 `ask` 普通消息在代码里分叉在哪？（`parseSlashCommand` + `sidebar` 拦截）  
3. 切换模型后，哪一行代码真正改了 API 请求体？（`stream.ts` 的 `model` 字段）

---

## 相关课文

- [第 40 课](/chapters/40-vscode-kernel-upgrade) — 插件 + ch36 内核基线  
- [第 41 课](/chapters/41-code-search) — grep 只读工具  
- [第 120 课](/chapters/120-edit-diff) — 规划中的写盘与 diff（尚未实现）
