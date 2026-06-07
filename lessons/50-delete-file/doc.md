# 第 50 课 · delete_file 删除文件

**约 15 分钟** · [第 49 课](/chapters/49-str-replace) 之后 · **独立插件**

此前 Agent 能读、能写、能局部改，但**不能删文件**——清理废弃脚本、临时产物只能让用户自己动手。本课在 [第 49 课](/chapters/49-str-replace) 之上增加 **`delete_file`**：在 cwd 下**永久删除单个文件**；路径限制与审批策略与 `write_file` / `str_replace` 相同。

![delete_file 审批：Enter 允许 · Esc 拒绝](/lessons/50-delete-file/image.png)

上图：用户说「删一下 a.py」，侧栏弹出 **`delete_file` 红色审批**（`Enter` 允许 · `Esc` 拒绝），批准后才真正 `unlink`。Agent 回一句「已删除」——用户夸「了不起」，它还在想「还有要搞的吗」……删文件这事，**审批栏比客气话重要**。

---

## 1. 安全提醒（动手前必读）

`delete_file` 调用的是系统级删除（`unlink`），**删除后无法通过本插件恢复**。误点批准、路径看错、Agent 理解错你的意图，都可能导致文件永久丢失。

**请只在可丢弃的测试目录里练习**，例如：

- 单独建一个空文件夹，如 `~/bagent-delete-playground/` 或 `lessons/50-delete-file/playground/`
- 用 VS Code / Cursor **只打开该文件夹** 作为工作区（cwd 即测试目录）
- 在里面新建 `tmp-delete-me.txt` 等**明确可删的临时文件**再让 Agent 删除

**不要**在以下环境测试或让 Agent 删文件：

- 个人文档、照片、下载目录、桌面上的重要文件
- 未提交或未推送的惟一代码副本、生产配置、数据库文件
- 公司项目主仓库里的真实业务代码（即使用户审批，风险仍由你承担）

审批框是最后一道闸，**不能代替你的判断**：批准前务必看清 `path` 是否就是要删的那一个文件。本课为教学示例，**不对任何数据丢失负责**；在重要数据上启用删除能力前，请自行备份并确认版本管理（如 Git）可用。

---

## 2. 何时用 delete_file

| 场景 | 推荐工具 |
|------|----------|
| 用户明确说「删掉这个文件」 | `delete_file` |
| 清理临时文件、废弃测试产物 | `delete_file` |
| 只清空内容、文件还要留着 | `str_replace` 或 `write_file` |
| 删整个目录 | **不支持**（本课只删文件） |
| 不确定路径对不对 | 先 `stat_file` 或 `read_file` |

删除**不可恢复**。每次删除都会弹出红色审批框，用户拒绝则不会执行。

---

## 3. 参数与行为

| 参数 | 作用 |
|------|------|
| `path` | 要删除的**文件**绝对路径（必填） |

行为要点：

- 仅删除**普通文件**；目标是目录 → 报错
- 文件不存在 → 明确报错
- 禁止 `.git`、`node_modules`、`.env` 及 cwd 外路径（与写工具一致）
- **须用户审批**（侧栏 danger 样式）
- 成功 → `{ "ok": true, "path": "/abs/path/foo.ts" }`

---

## 4. 代码位置

| 文件 | 作用 |
|------|------|
| `agent/deleteFile.ts` | `runDeleteFile()` — `unlinkSync` |
| `agent/tools.ts` | `delete_file` 定义、hook、`runTool` |
| `agent/system.ts` | 提示删文件用 `delete_file`、须审批 |
| `src/sidebar.ts` | `delete_file` 审批框 danger 样式 |

第 49 课的 `str_replace`、第 48 课行号 `read_file` 等**全部保留**，本课只增量 `delete_file`。

---

## 5. 动手

```bash
npm run ch50:compile
```

1. 新建可丢弃目录，例如 `mkdir -p ~/bagent-delete-playground`
2. 用编辑器**只打开该目录**为工作区（不要打开整个 `bagent` 主仓库做删除实验）
3. 打开 **`lessons/50-delete-file`** 子窗口 → **F5** 启动第 50 课插件（Extension Development Host 会继承当前工作区 cwd）
4. 在测试目录里新建 `tmp-delete-me.txt`，让 Agent `delete_file` 删掉它 → 侧栏应出现**红色**审批框
5. **看清路径后再批准**；批准后仅测试文件应消失。对目录、`.env` 等应报错

终端调试：在测试目录下执行 `npm run ch50`（同样不要用重要项目目录作 cwd）。

---

## 检查点

- [ ] 是否在**独立测试目录**练习，未动重要文件？
- [ ] `delete_file` 能删掉 cwd 下的普通文件？
- [ ] 对目录、不存在路径、`.env` 会拒绝？
- [ ] 审批框为 danger 样式（与 `write_file` 一致）？
- [ ] `str_replace` / `read_file` 仍可用？

---

[← 第 49 课](/chapters/49-str-replace)
