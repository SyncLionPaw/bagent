# 第 52 课 · 编辑提案（不落盘）

**约 25 分钟** · [第 51 课](/chapters/51-run-command) 之后 · **独立插件**

[第 43–51 课](/chapters/43-write-file) 里，用户点侧栏 ✓ 之后，worker 直接用 `fs` 写盘。要做「先看 diff、再 Accept」的 Code Agent，得先把两件事拆开：

1. **Agent 只产出改法**（改前 / 改后全文）  
2. **插件决定何时、是否写盘**

本课只做第 1 步：**写盘工具在内存里算提案，磁盘不动**。审批仍和第 51 课一样在侧栏 ✓/✗；**没有** `vscode.diff`，也**不会**写文件。  
[第 53 课](/chapters/53-diff-preview) 在本课提案之上接编辑器 diff 和 Accept 写盘。

---

## 1. 本课相对第 51 课改了什么

| | 第 51 课 | 第 52 课（本课） |
|--|----------|------------------|
| `str_replace` / `write_file` / `delete_file` 批准后 | worker `writeFileSync` / `unlink` | **只返回提案 JSON，不写盘** |
| 用户确认 | 侧栏 danger ✓/✗ | **相同**（仍是侧栏） |
| 编辑器区域 | 无 | **仍无**（预览留给 53） |
| `run_command` 等 | 侧栏审批 + 执行 | 不变 |

一句话：**审批流程没动，动的是「批准后执行什么」——从改磁盘改成吐提案。**

---

## 2. 提案是什么

工具在内存里算好「改之前整份文件」和「改之后整份文件」，封装成：

```json
{
  "ok": true,
  "proposal": true,
  "path": "/abs/path/to/file.ts",
  "oldContent": "…改前全文…",
  "newContent": "…改后全文…"
}
```

| 工具 | oldContent | newContent |
|------|------------|------------|
| `str_replace` | 读盘得到的当前全文 | 在内存里做完替换后的全文 |
| `write_file` | 文件已存在则读出现有内容；新建为 `""` | 参数里的 `content` |
| `delete_file` | 文件全文 | `""`（表示删空） |

**磁盘在批准后也不变。** 你可以在编辑器里打开该路径核对：内容仍是旧的。

---

## 3. 侧栏里你看到什么

流程与第 51 课相同：

```text
ToolCallStart → 侧栏 danger 审批（Enter / Esc）
  → 你点允许
  → worker 跑工具，算出提案
  → ToolResult 显示摘要，例如：
     「提案 /path/file.c（1200 → 1250 字符，未写盘）」
```

本课**不会**把几万字的 `oldContent` / `newContent` 塞进侧栏或对话 history——`loop.ts` 在发出 `ToolResult` 前会换成 **compact 摘要**（`oldChars` / `newChars`），避免大文件把 JSON 截断坏掉。长参数在侧栏里可折叠展开（与 53 课相同）。

---

## 4. 为什么先单独做这一课

| 若跳过 52 直接做 diff | 问题 |
|------------------------|------|
| worker 边算边写盘 | diff 打开时磁盘可能已脏，预览不可信 |
| 插件里临时拦 `fs` | 内核与壳耦在一起，难读难测 |

第 52 课把 **「算改法」** 固化在 worker / `editProposal.ts`；第 53 课只在 Extension Host 里消费同一份提案。终端 `npm run ch52` 也能跑通提案逻辑，不依赖 VS Code UI。

---

## 5. 和第 53 课的分工

| | 第 52 课（本课） | [第 53 课](/chapters/53-diff-preview) |
|--|------------------|--------------------------------------|
| worker 算提案 | ✅ | ✅（沿用） |
| 用户确认方式 | 侧栏 ✓/✗ | diff 标题栏 Accept / Reject |
| 写盘 | ❌ | Accept 后 `applyEdit` |
| 新事件 | 无（仍是 `ToolResult`） | `EditProposal` + `edit_apply` |

学完本课应能说清：**提案在 worker 里长什么样；第 53 课只是换了一种确认 UI，并真正写盘。**

---

## 6. 代码位置

| 文件 | 本课改动 |
|------|----------|
| `agent/editProposal.ts` | **新增**：`formatEditProposal`、`parseEditProposal`、`compactProposalSummary`、`isEditTool` |
| `agent/strReplace.ts` | 替换后 `formatEditProposal`，去掉 `writeFileSync` |
| `agent/deleteFile.ts` | 读文件后返回「删空」提案，去掉 `unlinkSync` |
| `agent/tools.ts` | `runWriteFile` 只算提案；写盘工具 **不做** `after` 截断（全文要先完整解析） |
| `agent/loop.ts` | 写盘工具 `ToolResult` / history 写入 compact 摘要 |
| `agent/system.ts` | 说明写删工具「只出提案、不落盘」 |
| `src/*` 插件壳 | 与第 51 课相同命名空间 `bagent52`；**无** `diffPreview.ts` |

---

## 7. 动手

```bash
npm run ch52:compile
```

1. **F5** 启动本课插件；工作区用**可丢弃的测试目录**
2. 让 Agent `str_replace` 改一行 → 侧栏审批 → 允许
3. 侧栏应显示「提案 … 未写盘」；**打开该文件，内容未变**
4. 再试 `write_file` 新建小文件、`delete_file` 删临时文件——批准后磁盘都应**不变**
5. 终端：`npm run ch52`，批准后可见 compact 摘要 JSON

---

## 检查点

- [ ] 三个写盘工具批准后磁盘都不变？
- [ ] 侧栏仍是 danger 审批（不是 diff Accept）？
- [ ] `ToolResult` 是短摘要（含 `oldChars` / `newChars`），不是整文件正文？
- [ ] 能说出本课与 [第 53 课](/chapters/53-diff-preview) 各管哪一段？

---

[← 第 51 课](/chapters/51-run-command) · [第 53 课 diff 预览 →](/chapters/53-diff-preview)
