# 第 43 课 · 危险工具 write_file

**约 35 分钟** · [第 42 课](/chapters/42-model-list) 之后 · 内核首次允许写盘

---

## 0. 为什么叫「危险」？

[第 41 课](/chapters/41-code-search) 止于此前的只读工具：`pwd`、`ls`、`read_file`、`grep`。本课增加 **`write_file`**：**用 `content` 整文件覆盖**目标路径——点错「允许」就可能改坏代码。

因此：

1. **必须走 [第 35 课](/chapters/35-tool-approval) 审批**（Webview 红框 ✓/✗）  
2. **`before` 钩子**拒绝敏感路径（`.git`、`node_modules`、`.env`）  
3. **尚无 diff 预览** — 那是 [第 120 课](/chapters/120-edit-diff) 的规划；本课先体验「能写」与「须批准」

---

## 1. 工具 API

| 参数 | 必填 | 说明 |
|------|------|------|
| `path` | 是 | 绝对路径，须在 **cwd** 下 |
| `content` | 是 | 写入后的**完整**文件内容，上限 100 000 字符 |

返回（JSON 字符串）：

```json
{"ok":true,"path":"/abs/path/hello.txt","bytes":5}
```

**禁止写入**（`before` 与 `runTool` 双检）：

- 路径落在 `.git`、`node_modules` 下  
- 文件名为 `.env` 或以 `.env.` 开头  
- cwd 外的路径  

---

## 2. 钩子

```typescript
write_file: {
  maxOutputChars: 512,
  before: [writePathBefore()],   // 路径 + content 长度
  after: [truncateAfter(512)],
},
```

`writePathBefore` 校验失败时抛 `ToolAborted`，与审批拒绝一样**不执行** `writeFileSync`。

---

## 3. 插件 UI

在 [第 42 课](/chapters/42-model-list) 斜杠命令基础上，本课侧重写盘：

- 顶栏：`⚠ write_file · 模型 …`  
- `write_file` 审批条加 **danger** 红框，与普通读工具区分  
- 仍保留 `/models`、`/balance`、`/config` 等 utils  

内核与 ch36 同步：`agent/tools.ts` 含五个工具。

---

## 4. 目录

```text
lessons/43-write-file/
  agent/              # ch36 内核 + write_file
  src/                # 插件（继承 42 的 slash utils）
  chat.ts             # 终端实验
  doc.md
```

---

## 5. 动手

```bash
cd /Users/gongyulei/bagent
npm run ch43:compile
cd lessons/43-write-file
code .    # F5
```

**安全试法**（在课目录 cwd 下）：

1. `在当前目录创建 hello.txt，内容一行 Hello`  
2. 出现红色 **write_file(...)** 审批 → 点 ✓  
3. 用资源管理器或 `read_file` 确认文件内容  

**终端**：

```bash
export DEEPSEEK_API_KEY=sk-...
npm run ch43
```

---

## 6. 检查点

1. 为什么 `write_file` 比 `read_file` 更依赖审批？  
2. 试图写 `node_modules/foo` 时，在哪一层被拦住？（`before` 钩子）  
3. 本课与第 120 课 diff 预览差在哪？（本课批准后直接落盘）

---

## 相关课文

- [第 35 课](/chapters/35-tool-approval) · [第 36 课](/chapters/36-tool-hooks)  
- [第 40 课](/chapters/40-vscode-kernel-upgrade) — 插件 worker  
- [第 120 课](/chapters/120-edit-diff) — 带 diff 的写盘（规划中）
