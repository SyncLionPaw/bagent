# 第 41 课 · 代码搜索（grep）

**约 25 分钟** · [第 36 课](/chapters/36-tool-hooks) 之后 · 内核加只读搜索工具

---

## 0. 为什么先加 grep？

[第 36 课](/chapters/36-tool-hooks) 的内核能 `pwd`、`ls`、`read_file`，但 Agent 不知道「哪个文件里有 `runTool`」——只能猜路径再整文件读入，慢且容易撞截断上限。

本课在 **同一套钩子管线** 上增加只读工具 **`grep`**：在 cwd 子树里按正则搜文本，返回 `file:line: content`，不启动子进程、不依赖系统 `rg`。

[第 40 课](/chapters/40-vscode-kernel-upgrade) 插件与 ch36 共用内核，F5 里也能用 `grep`（审批 + 结果截断与读文件相同）。

---

## 1. 工具 API

| 参数 | 必填 | 说明 |
|------|------|------|
| `pattern` | 是 | JavaScript 正则，**默认区分大小写** |
| `path` | 是 | 文件或目录的**绝对路径**，须在 **cwd** 下 |
| `glob` | 否 | 文件名过滤，如 `*.ts` |
| `max_results` | 否 | 最多几条匹配，默认 50，上限 200 |

行为要点：

- 遍历目录时**跳过** `.git`、`node_modules`
- 每条匹配一行：`/abs/path/file.ts:42: const x = 1`
- 纯 Node 同步读盘 + 逐行匹配（可移植）
- `before` 钩子校验 `path` 在 cwd 下；`after` 钩子 `truncateAfter(8000)` 写入 history

```typescript
// tools.ts 片段
grep: {
  maxOutputChars: GREP_MAX_CHARS,   // 8000
  before: [grepPathBefore()],
  after: [truncateAfter(GREP_MAX_CHARS)],
},
```

---

## 2. 终端试跑

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch41
```

建议三句：

1. `当前目录在哪` → 模型先 `pwd`
2. `在 agent 目录里搜 runTool，只看 ts 文件` → 应调用 `grep`，`glob: "*.ts"`
3. `搜整个 node_modules 里的 lodash` → 应被跳过或几乎无结果（目录在 SKIP 列表）

也可直接 `npm run ch36`，内核已含 `grep`。

---

## 3. 插件里试

与 [第 40 课](/chapters/40-vscode-kernel-upgrade) 相同：打开 `lessons/40-vscode-kernel-upgrade` → F5 → 右侧 bagent。

试：`在 tools.ts 里搜 grep 工具定义` → 审批通过后应看到 `file:line:` 列表。

---

## 4. 与 read_file 的分工

| 场景 | 工具 |
|------|------|
| 知道确切路径、要看全文 | `read_file` |
| 不知道在哪、先定位 | `grep` |
| 列目录结构 | `ls` |

本课**不**加 `write_file`、`shell`——搜索仍是只读能力。

---

## 5. 目录

```text
lessons/41-code-search/
  doc.md       # 本课（说明 grep 设计与用法）
  chat.ts      # 薄封装，复用 ch36 内核
```

实现源码在 [第 36 课 `tools.ts`](/chapters/36-tool-hooks) 与 [第 40 课 `agent/tools.ts`](/chapters/40-vscode-kernel-upgrade)。

---

## 检查点

- [ ] `grep` 的 `path` 为什么必须落在 cwd 下？
- [ ] 匹配条数与返回字符各在哪一层截断？（`max_results` vs `truncateAfter`）
- [ ] 为什么跳过 `node_modules` 而不是让模型自己 `glob` 排除？

---

[← 第 40 课](/chapters/40-vscode-kernel-upgrade) · [第 36 课 · 钩子](/chapters/36-tool-hooks)
