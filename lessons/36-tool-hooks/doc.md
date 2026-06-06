# 第 36 课 · 工具钩子（Hook）

**约 35 分钟** · [第 35 课](/chapters/35-tool-approval) 之后 · Agent 内核升级

---

## 0. 为什么需要 Hook？（第 35 课还没有）

[第 35 课](/chapters/35-tool-approval) 解决了 **能不能跑**（`approve` 审批）。但工具一旦执行，`runTool` 的返回值会 **原样** 写入 `history`：

```typescript
const output = runTool(call);
this.history.push({ role: "tool", content: output });
```

若 `read_file` 读到 `package-lock.json`（几十万字符），或 `ls` 列 `node_modules`：

- 下一轮 API 请求体暴涨 → 慢、贵、可能 400  
- 终端 `terminal.ts` 里 120 字 preview **只影响显示**，**救不了 history**

第 9、10 课曾在单个工具里手写 `slice(0, 1200)`，但 **24–35 的 Loop 没有统一扩展点**——每加一种后处理（截断、审计、脱敏）就改一遍 `loop.ts`，很快烂掉。

**本课做法**：在 `runTool` **前后** 挂 **钩子（Hook）**；字符截断是 `**after` 钩子** 的第一个实例。限额写在 **工具定义** 里，模型和用户都看得见。

本课还把 [第 35 课](/chapters/35-tool-approval) 的 `**approve` 收编进 `before[]`**——审批本身就是一种 **可短路管线的 pre-hook**。

```text
第 35 课（写法）：approve → runTool → history
本课（统一管线）：before[approvalBefore(approve), …] → runTool → after[truncate, …] → history
                              ↑ 拒绝时抛 ToolAborted，不执行 runTool
```

---

## 1. 用起来什么样

`npm run ch36` 后读大文件，终端可能显示：

```text
[工具] read_file({"path":"/Users/you/bagent/package-lock.json"})
  等待你批准…
允许 read_file(...)? [y/N] y
  → {   "name": "bagent",   "lockfileVersion": 3,   …
  （已截断：原文 128400 字符 → 写入 history 8000 字符）
AI: package-lock 很大，我只看到开头和结尾…
```

写入 history 的正文里，**中间** 已被换成：

```text
[已截断：原文 128400 字符，仅保留首尾，中间已省略]
```

模型下一轮读到的就是截断后的文本，不会误以为看完全文。

---

## 2. Hook 模型

```typescript
// hooks.ts
export type ToolHookBefore = (ctx: { call; name }) => void | Promise<void>;

export type ToolHookAfter = (ctx: { call; name; output }) => string | Promise<string>;

export class ToolAborted extends Error {
  readonly output: string;   // 写入 history 的占位结果
}
```

执行管线（`runWithHooks`）：

```text
for (hook of before)  await hook(ctx)     // 可 throw ToolAborted 短路
raw = execute(call)                       // 纯 runTool，不做截断
output = raw
for (hook of after)   output = await hook({ ...ctx, output })
return { status: "ok", output, truncated, originalLength }
```


| 阶段          | 典型用途                      |
| ----------- | ------------------------- |
| **before**  | **审批**、参数校验、审计日志          |
| **runTool** | 只做「读盘 / 列目录」本身            |
| **after**   | **截断**、脱敏（抹 API Key）、统计耗时 |


---

## 2.1 审批也是一种 pre-hook

[第 35 课](/chapters/35-tool-approval) 把 `approve` 单独写在 `loop.ts` 里。概念上它和 `before[]` 是一类事：**都在 `runTool` 之前**，不过审批多两件事：


|     | 普通 `before`    | `approvalBefore`（审批）                        |
| --- | -------------- | ------------------------------------------- |
| 问谁  | 纯代码            | 人（readline / Webview 按钮）                    |
| 失败时 | 一般抛错或打日志       | `throw ToolAborted` → `ToolCallDenied` 事件   |
| 注入  | 写在 `toolHooks` | `approve` 仍从 `chat.ts` 注入，再 **包进** before 链 |


```typescript
export function approvalBefore(approve: ApproveTool): ToolHookBefore {
  return async (ctx) => {
    if (!(await approve(ctx.call))) {
      throw new ToolAborted(TOOL_DENIED);
    }
  };
}

export function hooksWithApproval(hooks: ToolHooks, approve: ApproveTool): ToolHooks {
  return {
    ...hooks,
    before: [approvalBefore(approve), ...hooks.before],  // 审批永远排第一
  };
}
```

`loop.ts` 不再单独 `await approve(call)`，只调一次管线：

```typescript
yield { type: "ToolCallPending", ... };   // UI：马上要进 before 链了

const result = await runWithHooks(
  call,
  hooksWithApproval(hooksFor(call), approve),
  runTool,
);

if (result.status === "aborted") {
  yield { type: "ToolCallDenied", name };
  yield { type: "ToolResult", name, output: result.output };
  // ...
}
```

`approve` **仍从外部传入**（`turn(user, approve)`）——只是实现上变成 `before[0]`，不是 loop 里的特例分支。

```text
before 链示例（read_file）：
  1. approvalBefore(approve)   ← 第 35 课
  2. （将来）auditLog
  → runTool
  → truncateAfter(8000)          ← 本课 after
```

---

## 3. 截断作为 `after` 钩子

```typescript
export function truncateMiddle(output: string, maxChars: number): string {
  // 超长 → 保留首尾，中间换成 [已截断：原文 N 字符…]
}

export function truncateAfter(maxChars: number): ToolHookAfter {
  return ({ output }) => truncateMiddle(output, maxChars);
}
```

**为什么放 after、不写在 `runReadFile` 里？**

- `runTool` 保持「忠实读盘」，测试时可直接测原始输出  
- 截断策略 **可 per-tool 配置、可关掉、可换算法**，不用改三个 `runXxx`  
- 以后加 `redactSecretsAfter` 只要 `after: [truncateAfter(8000), redactSecrets]`

---

## 4. 工具定义里写清楚限额

限额 **单一数据源**：常量 → 钩子 + API `description`

```typescript
export const READ_FILE_MAX_CHARS = 8_000;

export const toolHooks = {
  read_file: {
    maxOutputChars: READ_FILE_MAX_CHARS,
    before: [],
    after: [truncateAfter(READ_FILE_MAX_CHARS)],
  },
};

// 发给模型的 tools 列表
description: toolDesc(
  "读取文本文件内容。",
  READ_FILE_MAX_CHARS,
),
// → "…返回文本上限 8000 字符；超出时保留首尾，中间替换为截断说明。"
```


| 工具          | 上限    | after 钩子              |
| ----------- | ----- | --------------------- |
| `pwd`       | 512   | `truncateAfter(512)`  |
| `ls`        | 4_000 | `truncateAfter(4000)` |
| `read_file` | 8_000 | `truncateAfter(8000)` |


模型在 **选工具时** 就能看到上限；截断后正文里的 `[已截断…]` 是 **第二次提醒**。

---

## 5. `loop.ts` 改动（相对第 35 课）

```typescript
import { hooksWithApproval, runWithHooks } from "./hooks.js";

const result = await runWithHooks(
  call,
  hooksWithApproval(hooksFor(call), approve),
  runTool,
);

if (result.status === "aborted") { /* ToolCallDenied + 拒绝结果 */ }
else { /* ToolResult + truncated */ }
```

审批与截断都在 **同一条 `runWithHooks` 管线** 里；`loop` 只负责 yield 事件和写 history。

---

## 6. 展示层 vs 数据层（再强调）


| 层      | 文件                          | 截断？     |
| ------ | --------------------------- | ------- |
| **数据** | `hooks.ts` → 进 `history`    | ✅ 本课重点  |
| **展示** | `terminal.ts` 120 字 preview | 仅终端一行预览 |


插件 Webview 可以再用更短的 preview，但 **必须以 history 里的截断结果为准**。

---

## 7. 目录

```text
lessons/36-tool-hooks/
  hooks.ts       # ToolHook*、truncateMiddle、runWithHooks
  tools.ts       # runTool + toolHooks + toolDefinitions（含上限说明）
  loop.ts        # runWithHooks 替代直接 runTool
  events.ts      # ToolResult + truncated / originalLength
  terminal.ts    # 截断时多打一行黄字
  chat.ts stream.ts messages.ts color.ts
```

---

## 8. 动手

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch36
```

建议：

1. `读 package.json` — 通常不截断
2. `读 package-lock.json 前 20 行大概什么结构` — 应触发截断，且 history 含 `[已截断…]`
3. `ls node_modules`（先 `pwd` 拼绝对路径）— `ls` 4k 上限

---

## 9. 和第 35 课的关系


|      | 第 35 课                     | 第 36 课（本课）                       |
| ---- | -------------------------- | -------------------------------- |
| 审批   | `loop` 里单独 `await approve` | `**approvalBefore` = before[0]** |
| 截断   | 无                          | `after[]` 里 `truncateAfter`      |
| 管线   | 两段式                        | **统一 `runWithHooks`**            |
| 工具说明 | 无字符上限                      | **写明 maxOutputChars**            |


第 35 课教「为什么要批、怎么从外部注入 `approve`」；本课把它 **收编进 pre-hook**，并加上 after 截断。

---

## 检查点

- [x] **审批为什么算 pre-hook？和普通 `before` 差在哪？**  
- [ ] `ToolAborted` 抛出后，`runTool` 还会执行吗？  
- [ ] `hooksWithApproval` 为什么把 `approvalBefore` 放在 `before[0]`？  
- [ ] 截断为什么放在 `after` 而不是 `runReadFile` 内部？  
- [ ] `toolDefinitions.description` 和 `toolHooks.maxOutputChars` 为什么要共用常量？  
- [ ] `terminal` 的 120 字 preview 和 `history` 里的截断是一回事吗？

---

[← 第 35 课](/chapters/35-tool-approval) · [第 37 课](/chapters/37-two-loops) · [第 38 课](/chapters/38-agent-product)