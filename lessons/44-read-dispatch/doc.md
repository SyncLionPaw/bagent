# 第 44 课 · 按类型读文件

**约 35 分钟** · [第 43 课](/chapters/43-write-file) 之后 · **独立插件**，不改动第 40 课内核

---

## 0. 本课与第 40 课的关系

[第 40 课](/chapters/40-vscode-kernel-upgrade) 仍是「插件对齐 ch36」：`read_file` 只读 **UTF-8 文本**。

本课在 **自己的目录** 里 fork [第 43 课](/chapters/43-write-file) 插件骨架，单独加入：

- `stat_file` — 看类型与 hint
- `read_file` 分发 — PDF（`pdf-parse`）、Excel（`xlsx`）、图片/Office 等返回 hint
- 扫描版 PDF → `当前pdf文件 可能需要ocr解析（开发中）`

**打开第 40 课不会出现本课能力**；测读文件分发请只开本课。

---

## 1. 目录结构

```text
lessons/44-read-dispatch/
  doc.md
  chat.ts              # 终端 demo（用本课 agent/，不是 ch36）
  package.json
  agent/               # 独立 worker 内核
    fileKind.ts
    readDispatch.ts
    tools.ts
    loop.ts …
  src/                 # VS Code 扩展
    extension.ts
    sidebar.ts
    spawn.ts
    utils/ …
  .vscode/launch.json
```

依赖 `pdf-parse`、`xlsx` 只装在本课 `package.json`，不污染仓库根或第 40 课。

---

## 2. 工具行为摘要

| kind | read_file |
|------|-----------|
| 文本 | UTF-8 直读 |
| PDF | pdf-parse；无文字层 → OCR hint（开发中） |
| Excel | xlsx → 各表 CSV 文本 |
| 图片 / Office / 压缩包 | JSON + hint，供 Agent 转告用户 |

---

## 3. VS Code 动手

```bash
cd /你的路径/bagent
npm run ch44:compile
```

1. **文件 → 打开文件夹** → `lessons/44-read-dispatch`（不要开仓库根）
2. **F5** → Extension Development Host
3. `Cmd+Shift+P` → **bagent: 打开 Agent 面板（读文件分发）**
4. 试 `stat_file` / `read_file` 工作区里的 `.png`、`.pdf`、`.xlsx`

Key：`~/.bagent/deepseek-api-key` 或 `export DEEPSEEK_API_KEY`。

---

## 4. 终端动手

```bash
export DEEPSEEK_API_KEY=你的key
npm run ch44:compile   # 安装本课依赖
npm run ch44
```

---

## 5. 后续

OCR / 多模态读图接口预留于 `readDispatch.ts`；接入后只改本课，不影响第 40 课。

---

## 检查点

- [ ] 第 40 课 F5 后是否 **没有** `stat_file`？
- [ ] 第 44 课读 `.png` 是否返回 OCR hint？
- [ ] 扫描版 PDF 是否出现「可能需要 ocr 解析（开发中）」？

---

[← 第 43 课](/chapters/43-write-file) · [第 40 课](/chapters/40-vscode-kernel-upgrade)
