# 第 47 课 · 对话保存（斜杠命令）

**约 30 分钟** · [第 46 课](/chapters/46-reminder-injection) 之后 · **独立插件**

多轮 Agent 的 `history` 在内存里，关掉就丢。本课用 **序列化 / 反序列化** 把完整 `messages` 存成 JSON，并用斜杠命令手动存档；同时 **自动会话** 写入 `sessions/`，防止意外丢失。

---

## 1. 存储布局

```text
~/.bagent/{项目名}/
  chats/              ← /save [name] 手动命名存档
    summer-trip.json
  sessions/           ← 自动保存
    current.json      ← 最新进度（每轮结束 + 每 120s）
    session-2026-06-07-14-30.json
```

JSON 结构（`version: 1`）：

```json
{
  "version": 1,
  "kind": "archive | session",
  "sessionId": "session-…",
  "savedAt": "…",
  "project": "papers",
  "cwd": "/path/to/project",
  "messages": [ … ]
}
```

`messages` 即完整 `history`：system、user、assistant、tool 等，可直接 `replaceHistory()` 恢复。

---

## 2. 斜杠命令

| 命令 | 作用 |
|------|------|
| `/save` | 手动存档到 `chats/`（自动命名） |
| `/save summer-trip` | 命名存档（覆盖同名） |
| `/load` | 加载 `sessions/current.json` |
| `/load summer-trip` | 加载 `chats/` 或 `sessions/` 下同名文件 |
| `/saves` | 列出 `chats/` 与 `sessions/` |

均 **不进 Agent history**。

---

## 3. 自动保存

- Worker / 终端启动时：若存在 `sessions/current.json`，**自动恢复** history
- 每轮对话结束后写入 `sessions/{sessionId}.json` 与 `current.json`
- 每 **120 秒** 定时写入（有用户消息时）
- 进程 `shutdown` 前再写一次

---

## 4. 工具审批快捷键

侧边栏出现审批条时：

- **Enter**（或点允许）→ 同意
- **Esc** → 拒绝
- 审批期间输入框禁用，避免误发消息

---

## 5. 代码位置

| 文件 | 作用 |
|------|------|
| `agent/chatSave.ts` | 序列化、路径、`save` / `load` / `autosave` |
| `agent/loop.ts` | `replaceHistory()` 反序列化恢复 |
| `agent/worker.ts` | 启动恢复、定时 autosave、`load_chat` op |
| `src/spawn.ts` | `saveChat` / `loadChat`、`SessionReady` |
| `src/utils/slash.ts` | `/save`、`/load`、`/saves` |
| `src/sidebar.ts` | 斜杠处理、审批 Enter/Esc |

---

## 6. VS Code 动手

```bash
npm run ch47:compile
```

1. 打开 **`lessons/47-chat-save`** → **F5**
2. 聊几轮 → 检查 `~/.bagent/{项目}/sessions/current.json`
3. `/save my-chat` → `chats/my-chat.json`
4. 新开一轮后 `/load my-chat` 继续
5. 触发 `write_file` 审批，用 **Enter** 放行

---

## 检查点

- [ ] `/save` 写出完整 JSON，`messages` 含 tool 消息？
- [ ] 重启插件后自动恢复 `current.json`？
- [ ] `/load` 后 Agent 能基于旧 history 继续？
- [ ] 审批条 Enter 可放行？

---

[← 第 46 课](/chapters/46-reminder-injection)
