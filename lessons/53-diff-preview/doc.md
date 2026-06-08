# 第 53 课 · Diff 预览与 Accept 写盘

**约 35 分钟** · [第 52 课](/chapters/52-edit-proposal) 之后 · **独立插件**

[第 52 课](/chapters/52-edit-proposal) 已在 worker 里把 `write_file` / `str_replace` / `delete_file` 改成**只出提案、不落盘**。但审批仍在侧栏点 ✓/✗，中间编辑器毫无动静——还不是 Cursor 那种体验。

本课接上 VS Code **编辑器本体**：并排 diff 预览 → 标题栏 **Accept / Reject** → 只有你 Accept 才 `applyEdit` 写盘。侧栏继续负责聊天；**红绿对比和写盘确认在中间的 diff 里**。

---

## 1. 本课相对第 51–52 课多了什么

| | 第 51 课 | 第 52 课 | 第 53 课（本课） |
|--|----------|----------|------------------|
| worker 写盘 | `fs` 直接写 | 只算提案 | 只算提案（同 52） |
| 用户确认 | 侧栏 ✓/✗ | 侧栏 ✓/✗ | **diff 标题栏 Accept / Reject** |
| 预览 | 无 | 无 | **`vscode.diff` 左旧右新** |
| 写盘执行方 | worker | 无 | **Extension Host `applyEdit`** |

`run_command` 仍走侧栏 danger 审批，与本课无关。

---

## 2. 整条链路

```text
用户说话
  → 模型调 write_file / str_replace / delete_file
  → worker 内存算出 oldContent / newContent（不落盘）
  → stdout 发出 EditProposal 事件
  → Extension Host：
       虚拟 URI（bagent-old / bagent-new）灌入全文
       vscode.diff 打开并排预览
       标题栏出现 Accept / Reject
  → 你点 Accept：
       applyEdit（或 fs.write / delete）写盘
       先打开真实文件，再关 diff 预览（减少闪屏）
       edit_apply { allow: true } 回 worker
  → worker 给模型 ToolResult { ok, applied: true, path }
  → 你点 Reject（或关掉 diff 标签）：
       关预览，不写盘，模型收到「用户拒绝」
```

三种写盘工具**共用**这条线——不是只有 `write_file` 能预览。`str_replace` 同样在内存里得到「改前全文 / 改后全文」再 diff；diff 里**只有变了的行**标红绿，没变的行通常对齐显示。

---

## 3. 侧栏 vs 编辑器：谁干什么

| 区域 | 本课职责 |
|------|----------|
| **右侧 Webview** | 聊天、流式输出、工具名与折叠后的长参数、`[diff] str_replace → path` 提示 |
| **中间 diff 编辑器** | 红绿并排对比、标题栏 **✓ Accept / ✗ Reject** |
| **worker 子进程** | Agent Loop、算提案、等 `edit_apply`，**不** `writeFileSync` |

这和 [第 29 课](/chapters/29-agent-split)、[第 39 课 ACP](/chapters/39-agent-client-protocol) 说的分工一致：**Client 画 UI（含 diff），Agent 只出改法**。

---

## 4. 新增事件与 stdio 操作

### `EditProposal`（worker → 插件）

```json
{
  "type": "EditProposal",
  "tool": "str_replace",
  "path": "/abs/path/file.c",
  "oldContent": "…改前全文…",
  "newContent": "…改后全文…",
  "arguments": "{…原始 tool 参数…}"
}
```

插件据此打开 diff；**全文走事件管道，不塞进侧栏气泡**（避免几万字符截断）。

### `edit_apply`（插件 → worker）

用户点 Accept / Reject 后，插件 stdin 一行：

```json
{ "op": "edit_apply", "allow": true }
```

worker 里挂起的 `editApply()` 返回，Loop 继续给模型回 ToolResult。

---

## 5. 插件侧实现要点

| 文件 | 作用 |
|------|------|
| `agent/editProposal.ts` | 提案类型、`parseEditProposal`、`formatAppliedEdit`；写盘工具**不做 output 截断** |
| `agent/loop.ts` | 写盘工具跳过侧栏 `approve`，走 `EditProposal` → `editApply` |
| `agent/events.ts` | `EditProposal` 事件定义 |
| `agent/worker.ts` | 处理 `edit_apply` |
| `src/diffPreview.ts` | `TextDocumentContentProvider`、`vscode.diff`、关预览、写盘 |
| `src/spawn.ts` | `editApply(allow)` 转发子进程 |
| `src/sidebar.ts` | 收到 `EditProposal` 调 diff；长工具参数/结果可折叠 |
| `package.json` | `bagent53.acceptEdit` / `rejectEdit` 挂在 `diffEditor/title` |

虚拟 scheme：`bagent-old`（左）、`bagent-new`（右）。Accept 成功后：打开磁盘真实文件 → 关 diff 标签 → 侧栏显示「已写盘 …」。

---

## 6. `str_replace` 还是 `write_file`？

| 工具 | diff 里常见样子 | 建议 |
|------|-----------------|------|
| **`str_replace`** | 只改匹配片段时，diff 上通常一小块红绿 | **已有文件优先**；`old_string` 尽量短 |
| **`write_file`** | 整文件替换，常大片变动 | 新建小文件或确需全文重写时用 |
| **`delete_file`** | 右栏空文件，表示删除 | 删前看清路径 |

模型若把整段函数塞进 `old_string`，diff 仍会显示一大块改动——那是**替换范围大**，不是工具不对。

---

## 7. 动手

```bash
npm run ch53:compile
```

1. 在 `lessons/53-diff-preview` **F5** 启动插件（改 `package.json` 后需重载扩展）
2. 工作区用**可丢弃的测试目录**（不要拿重要仓库试删改）
3. 让 Agent `str_replace` 改一行文案，或 `write_file` 新建小文件
4. 应出现并排 diff，标题栏有 **Accept / Reject**（不是侧栏 danger 框）
5. **Accept** → 磁盘更新、预览关闭、打开真实文件
6. 再试 **Reject** → 预览关闭，磁盘不变

终端调试：`npm run ch53` 无图形 diff，会在提案后文字询问「写盘? [Y/n]」。

---

## 8. 打成 .vsix：不用自己 compile

跟 [第 33 课](/chapters/33-vscode-vsix) 一样，可以把本课插件打成 **安装包**，装好后像市场插件一样用，**不必**打开课目录 F5。

维护者在仓库根目录：

```bash
npm run ch53:package
```

会 `npm install` → `compile` → `vsce package`，产出：

```text
lessons/53-diff-preview/bagent-0.0.1.vsix
```

把这个 `.vsix` 发给学习者即可。面向用户的固定下载入口：[GitHub Releases · bagent-plugin.vsix](https://github.com/SyncLionPaw/bagent/releases/latest)（见 [安装插件](/guide/install-plugin)）。

**安装（VS Code / Cursor）**

1. 扩展面板右上角 `⋯` → **从 VSIX 安装…** → 选上面的文件  
2. 或终端：

```bash
cursor --install-extension /path/to/bagent-0.0.1.vsix
# code --install-extension …   # 纯 VS Code
```

3. 配置 `~/.bagent/deepseek-api-key`（或 `export DEEPSEEK_API_KEY`）  
4. 命令面板运行 **bagent: 打开 Agent 面板**，或点右侧辅助栏 bagent 图标  

发布给用户时扩展名显示为 **bagent**（带 logo 与 README）。内部命令 ID 仍为 `bagent53`，与第 51、52 课插件可并存，但一般只启用一个。

---

## 检查点

- [ ] 写盘工具不再走侧栏 ✓/✗？
- [ ] diff 在**编辑器中间**打开，标题栏能 Accept / Reject？
- [ ] Accept 后内容正确，且预览 tab 已关闭？
- [ ] Reject 或关 diff 标签后磁盘未变？
- [ ] 读过 [第 52 课](/chapters/52-edit-proposal) 提案在 worker 里怎么算？

---

[← 第 52 课](/chapters/52-edit-proposal)
