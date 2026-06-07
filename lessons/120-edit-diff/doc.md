# 第 120 课 · 编辑与 Diff 预览（规划中）

**状态：未实现** · 路线图章节，先讲清要做成什么样

---

## 0. 这课解决什么

[第 43 课](/chapters/43-write-file) 已提供带审批的 **`write_file`（整文件覆盖，无 diff）**。本课规划的是 **先预览 diff、再 Accept 写盘** 的产品级体验。

真正的 Code Agent（Cursor、Copilot 等）还要能 **提案修改 → 红绿 diff 预览 → 用户 Accept 才写盘**。[第 38 课](/chapters/38-agent-product) 刻意把写盘留到后面；本课就是那条线的落点。

---

## 1. 整条链路（Client 画 UI，Agent 只出改法）

```text
用户：把这个函数加上类型注解
  → Agent 调 search_replace / apply_patch（工具参数）
  → 插件算出「改后全文」（内存里，磁盘未动）
  → vscode.diff 或内联 decoration 展示红绿对比
  → 用户 Accept → WorkspaceEdit 写盘
  → ToolResult 回传给 Agent，继续下一轮
```

和 [第 35 课](/chapters/35-tool-approval) 审批的关系：

| 阶段 | 读工具（现已实现） | 写工具（本课） |
|------|-------------------|----------------|
| 模型意图 | `read_file` / `grep` | `search_replace` / `apply_patch` |
| 用户确认 | Webview ✓/✗ | **先看 diff**，再 Accept / Reject |
| 副作用 | 无 | Accept 后才 `applyEdit` |

[第 39 课 ACP](/chapters/39-agent-client-protocol) 里说的「diff 在 IDE 画」就是这个分工：Agent 不抢编辑器，插件负责展示与落盘。

---

## 2. 计划里的工具形态

### `search_replace`（优先）

```json
{
  "path": "/abs/path/to/file.ts",
  "old_string": "function foo() {",
  "new_string": "function foo(x: number) {"
}
```

- `old_string` 须在文件中 **唯一匹配**，否则返回错误让模型重试  
- 执行函数 **先不写盘**，只返回 `{ path, oldContent, newContent }` 给插件

### `apply_patch`（可选进阶）

Unified diff / patch 文本，适合多行、多 hunk 修改；Client 用同样方式算 `newContent` 再 diff。

### 安全钩子（`before`）

- 路径必须在 cwd 子树下（与 `grep` / `read_file` 一致）  
- 默认禁止改 `.git`、`.env`、`node_modules`  
- 可限制单次 patch 行数 / 文件数

---

## 3. 插件侧要做的事

在 [第 40 课](/chapters/40-vscode-kernel-upgrade) 的 stdio + Webview 上扩展：

| 能力 | 做法 |
|------|------|
| Diff 预览 | `vscode.diff` + `TextDocumentContentProvider`（`bagent:old` / `bagent:new` 虚拟 URI） |
| 或内联高亮 | `TextEditorDecorationType` 标增删行 |
| Accept | `vscode.workspace.applyEdit(WorkspaceEdit)` |
| 事件（拟定） | `EditPreview { path, hunks? }`，Webview 可显示「待确认 1 处修改」 |
| 拒绝 | 不落盘，`ToolAborted` 回内核 |

Worker 里 **不** 直接 `fs.writeFile`；写盘权限留在 Extension Host，和「审批在 UI、内核只等 `approve`」同一思路。

---

## 4. Diff 怎么算

1. **旧文本**：磁盘当前内容（或 `read_file` 缓存）  
2. **新文本**：在内存里应用 `search_replace` / patch  
3. **对比**：按行 LCS（Myers diff），库可用 `diff`（jsdiff）或 VS Code 内置能力  
4. **展示**：删除行红、新增行绿；用户 Accept 前文件 URI 不变

---

## 5. 前置与相关课文

建议读完再动手实现本课：

| 课 | 为什么需要 |
|----|------------|
| [第 35 课](/chapters/35-tool-approval) | `approve` 管线 |
| [第 36 课](/chapters/36-tool-hooks) | `before` / `after` 钩子 |
| [第 29 课](/chapters/29-agent-split) | Client / Agent 分工 |
| [第 40 课](/chapters/40-vscode-kernel-upgrade) | spawn、事件、Webview |
| [第 41 课](/chapters/41-code-search) | 只读探索已齐，再上加写 |

---

## 6. 本课动手清单（实现时对照）

- [ ] `search_replace` 工具 + `before` 路径校验  
- [ ] 工具执行返回「提案」，写盘移到插件 Accept  
- [ ] `EditPreview`（或复用 `ToolCallPending` + diff 页）  
- [ ] `vscode.diff` 并排预览  
- [ ] Accept / Reject 与 `approve` 打通  
- [ ] 课文示例：改插件里一行文案，F5 里走完整流程  
- [ ] 同步 ch40 `agent/` 与终端 ch36 内核  

---

## 7. 刻意仍不做

- 无限制 `run_shell`  
- 自动 Accept、无预览写盘  
- 对标 Cursor 全量 multi-file refactor  
- MCP / RAG 全家桶（见 [第 38 课](/chapters/38-agent-product)）

---

**当前**：仓库尚无本课代码；第 42–119 课槽位留给 CLI TUI、内核抽包、更多只读工具等。本课编号 **120** 固定留给「编辑 + diff」。
