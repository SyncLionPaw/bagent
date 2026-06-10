# 第 54 课 · 写盘后诊断

**约 30 分钟** · [第 53 课](/chapters/53-diff-preview) 之后

第 53 课 Agent 改完文件、用户 Accept 之后，并不知道改得对不对——类型错误只有下次 LLM 轮才能发现。本课在 `editApply()` resolve（文件已写盘）后立刻跑诊断，把结果作为 tool result 的一部分送给 LLM，让它**当轮就能看到报错并自我修正**。

---

## 两件事

| | 第 53 课 | 第 54 课（本课） |
|---|---|---|
| 写盘后动作 | 无 | 自动跑诊断 |
| LLM 看到 tool result | `{ok,path,applied,bytes}` | 同上 + `diagnostics` 字段 |
| `run_command` 白名单 | curl / ps / lsof | 同上 + **tsc / node --check / python3** |

---

## 1. 诊断时机

关键约束：**诊断必须在文件写盘之后跑**，否则得到的是旧内容的结果。

```
loop.ts
  const allowed = await editApply()   ← Extension Host 先写盘，再 resolve
  if (!allowed) ...
  const diagNote = runDiagnosticAfterEdit(proposal.path)   ← 文件已在磁盘 ✓
  const applied  = formatAppliedEdit(proposal.path, proposal.newContent, diagNote)
```

`editApply()` 在 `diffPreview.ts` 里的顺序：`applyEdit()` → `session.resolve(true)`，所以 resolve 时文件已落盘。

---

## 2. diagnostics.ts — 按扩展名分发

```
agent/diagnostics.ts
  diagRegistry: Record<string, DiagFn>
    .ts / .tsx  → diagTsc()          tsc --noEmit（全项目类型检查）
    .py         → diagPython()       python3 -m py_compile <file>
    .js / .mjs  → diagNodeSyntax()   node --check <file>

  runDiagnosticAfterEdit(filePath)
    ↓ extname → 查 diagRegistry → 调 diagCli()
    ↓ 工具未安装（ENOENT）或无错  → 返回 ""（静默）
    ↓ 有报错                     → 返回 "\n\n[TypeScript 类型检查 发现错误]\n..."
```

**设计原则**

- **静默优先**：工具没装、没有错误 → 空串，不产生噪声
- **截断保护**：最多 3000 字符，避免大型项目把 context 撑满
- **易扩展**：加新语言只需往 `diagRegistry` 里插一条

---

## 3. formatAppliedEdit 加 diagnostics 字段

```typescript
// editProposal.ts（改动）
export function formatAppliedEdit(
  path: string,
  newContent: string,
  diagnostics?: string,   // ← 新增可选参数
): string {
  return JSON.stringify({
    ok: true, path, applied: true,
    bytes: Buffer.byteLength(newContent, "utf-8"),
    ...(diagnostics ? { diagnostics } : {}),
  });
}
```

LLM 看到的 tool result：

```json
{
  "ok": true,
  "path": "/project/src/foo.ts",
  "applied": true,
  "bytes": 1420,
  "diagnostics": "\n\n[TypeScript 类型检查 发现错误]\nsrc/foo.ts:12:5 - error TS2345: ..."
}
```

无报错时没有 `diagnostics` 字段，不改变旧行为。

---

## 4. run_command 新增白名单

本课把只读诊断命令加入白名单，让 LLM 也能主动触发检查（而不只是自动触发）：

| 命令 | 限制 |
|------|------|
| `tsc --noEmit` | 必须带 `--noEmit`；禁止 `--outDir`、`--watch` 等 |
| `node --check <file>` | 必须带 `--check`；不执行代码 |
| `python3 -m py_compile <file>` | 仅 `py_compile` 和 `-c` 表达式 |

---

## 5. 效果示例

用户让 Agent 改一个 TypeScript 函数，Agent 写盘后当轮 tool result：

```json
{
  "ok": true, "path": "src/utils.ts", "applied": true, "bytes": 890,
  "diagnostics": "\n\n[TypeScript 类型检查 发现错误]\nsrc/utils.ts:8:3 - error TS2322: Type 'string' is not assignable to type 'number'."
}
```

LLM 立刻知道类型不对，**不需要用户再提一次**，下轮自动修复。

---

## 检查点

- [ ] `agent/diagnostics.ts` 存在，`runDiagnosticAfterEdit` 已导出？
- [ ] `agent/loop.ts` 在 `editApply()` 之后、`formatAppliedEdit()` 之前调用诊断？
- [ ] tsc 没装时静默（`ENOENT` 不崩溃）？
- [ ] 有 TS 报错时 tool result 里出现 `diagnostics` 字段？
- [ ] `run_command tsc --noEmit` 被放行，`tsc` 不带 `--noEmit` 被拒绝？

---

[← 第 53 课](/chapters/53-diff-preview)
