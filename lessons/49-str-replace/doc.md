# 第 49 课 · str_replace 局部修改

**约 20 分钟** · [第 48 课](/chapters/48-read-lines) 之后 · **独立插件**

[第 43 课](/chapters/43-write-file) 的 `write_file` 会**整文件覆盖**——改一行也要把全文塞进 `content`，大文件易出错、diff 难读。第 48 课起 `read_file` 带行号，模型能精确定位，但写入仍只有「全量覆盖」一种方式。

本课在 [第 48 课](/chapters/48-read-lines) 之上增加 **`str_replace`**：按 **exact match** 搜索替换，只改匹配片段；路径限制与审批策略与 `write_file` 相同。

![用两次 str_replace 改 CSS 与 innerHTML 模板，日期与标题同行](/lessons/49-str-replace/image.png)

上图是一次真实改动：`timeline.html` 里卡片日期与标题原先上下两行，只需动 **两段** 连续原文——一段 CSS（`.card .date` → `.card-header` 的 flex 布局）、一段 JS 模板字符串里的 `innerHTML`。两次 `str_replace` 各替换一处，**不必**用 `write_file` 重写整份 HTML；左侧预览立刻变成日期与标题同一行、卡片更矮。这正是局部修改的优势：**diff 小、上下文少、大文件也安全**。

---

## 1. 何时用 str_replace vs write_file

| 场景 | 推荐工具 |
|------|----------|
| 改函数名、修 typo、删一行 | `str_replace` |
| 新建小文件、整文件重写 | `write_file` |
| 不确定原文长什么样 | 先 `read_file`，再 `str_replace` |

`str_replace` 不做模糊匹配：空格、缩进、换行须与文件**完全一致**。行号输出里的 `  12|` 前缀**不能**写进 `old_string`——只复制 `|` 右侧正文。

---

## 2. 参数与行为

| 参数 | 作用 |
|------|------|
| `path` | 绝对路径（必填）；须在 cwd 下，禁止 `.git`、`node_modules`、`.env` |
| `old_string` | 要查找的原文（必填，非空） |
| `new_string` | 替换文本（必填，可为 `""` 表示删除） |
| `replace_all` | 可选，默认 `false`；`true` 时替换所有匹配 |

行为要点：

- 只处理 **UTF-8 纯文本**；二进制或非文本类型（PDF、图片等）返回错误
- **0 次匹配** → 明确报错，提示用 `read_file` 核对
- **多次匹配且 `replace_all=false`** → 报错，要求唯一或设 `replace_all=true`
- **成功** → 写回文件，返回 `{ ok: true, path, replacements, bytes }`
- **须用户审批**（与 `write_file` 相同；侧栏红色 danger 框）

示例：把 `hello` 改成 `world`（文件中仅一处）：

```json
{ "path": "/abs/path/foo.ts", "old_string": "hello", "new_string": "world" }
```

成功返回：

```json
{ "ok": true, "path": "/abs/path/foo.ts", "replacements": 1, "bytes": 1284 }
```

---

## 3. 代码位置

| 文件 | 作用 |
|------|------|
| `agent/strReplace.ts` | `runStrReplace()`：读文件、计数匹配、写回 |
| `agent/tools.ts` | `strReplaceBefore` 校验、`toolHooks`、工具定义、`runTool` 分支 |
| `agent/system.ts` | 提示小改动用 `str_replace`、须审批 |
| `src/sidebar.ts` | `str_replace` 审批框 danger 样式 |

第 48 课的行号 `read_file`、截断翻页、对话保存等**全部保留**，本课只增量 `str_replace`。

---

## 4. 动手

```bash
npm run ch49:compile
```

1. 打开 **`lessons/49-str-replace`** → **F5**
2. 让 Agent 在 cwd 下创建 `demo.txt`，写入两行文本
3. 再让 Agent 用 `str_replace` 改其中一行 → 侧栏应出现**红色**审批框
4. 允许后 `read_file` 确认只改了目标片段；其余行不变

终端调试：`npm run ch49`（审批时终端会提示「将修改文件内容」）。

---

## 检查点

- [ ] `str_replace` 审批框为 danger 样式（与 `write_file` 一致）？
- [ ] 0 匹配、多匹配未设 `replace_all` 时有清晰报错？
- [ ] 成功返回含 `replacements` 与 `bytes`？
- [ ] `read_file` 行号、`offset` 续读仍正常？
- [ ] `/save`、`/load` 对话保存仍可用？

---

[← 第 48 课](/chapters/48-read-lines)
