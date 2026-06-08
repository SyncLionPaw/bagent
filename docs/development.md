# 维护文档站

## 目录

```text
lessons/NN-xxx/     # 课文 doc.md + 示例代码（源）
docs/chapters/      # 构建时由 sync-docs 生成，勿手改
docs/guide/         # 站点通用页
scripts/sync-docs.mjs
scripts/sync-brand.py
.github/workflows/docs.yml
```

## 命令

```bash
npm run sync-brand  # image.png → docs/public（favicon / logo）
npm run sync-docs   # lessons → docs/chapters
npm run dev
npm run build
```

站点图标在 `docs/public/`（`favicon.ico`、`logo-icon.png` 等），源图是仓库根目录 `image.png`。改图后跑 `npm run sync-brand` 再 build。

新增一章：

1. 建 `lessons/NN-xxx/doc.md` + 示例代码  
2. `npm run sync-docs`（会删除 `docs/chapters/` 里已无对应 lesson 的陈旧页面）  
3. 改 `docs/.vitepress/config.mts` 侧栏  
4. 根目录 `package.json` 加 `scripts`（如 `ch36`、`ch102:compile`）  
5. `npm run build` 确认无 dead link  

扩展阅读课（如 101、102）只写 `doc.md` 即可；有代码 demo 的课（如 102）另加 `package.json` 与 `src/`。

## GitHub 自动构建与发布

与 [pagent](https://github.com/SyncLionPaw/pagent) 一样：`.github/workflows/docs.yml` 在 **push `main`** 时跑 Actions，把 `docs/.vitepress/dist` 推到 **`gh-pages` 分支**，由 GitHub Pages 对外提供静态站。

线上地址（项目页路径与 `docs/.vitepress/config.mts` 里 `base: "/bagent/"` 一致）：

**https://synclionpaw.github.io/bagent/**

### 你需要在 GitHub 上配置什么

按顺序做一次即可（**不用**在 Secrets 里填 PyPI token 之类；文档部署只用内置 `GITHUB_TOKEN`）。

| 步骤 | 位置 | 设置 |
|------|------|------|
| 1 | 仓库 **Settings → Actions → General** | **Workflow permissions** 选 **Read and write permissions**（允许 workflow 往 `gh-pages` 推代码）。若组织仓库被策略锁住，需组织管理员放开。 |
| 2 | 仓库 **Settings → Pages** | **Build and deployment → Source** 选 **Deploy from a branch**；**Branch** 选 **`gh-pages`**，文件夹 **`/ (root)`**。不要选 “GitHub Actions” 作为 Pages 源（本仓库用 peaceiris 写 `gh-pages` 分支，与 pagent 相同）。 |
| 3 | 本地 | 确认已提交：`package-lock.json`、根目录 `image.png`、`.github/workflows/docs.yml`、`docs/public/` 可省略（CI 会从 `image.png` 生成）。 |
| 4 | 本地 | `git push origin main`（或合并进 `main` 的 PR 合并后） |
| 5 | 仓库 **Actions** 页 | 打开 **Docs** workflow，等绿灯；首次成功后 **Settings → Pages** 会显示站点 URL。 |

手动重跑：Actions → **Docs** → **Run workflow**（`workflow_dispatch`）。

### 与 pagent 的差异

| | pagent | bagent |
|--|--------|--------|
| `package.json` | 在 `docs/` 下 | 在**仓库根** |
| CI `npm ci` | `working-directory: docs` | 仓库根执行 |
| 构建前 | 仅 Node | Node + **Python 3.12 + Pillow**（`npm run build` 会跑 `sync-brand`） |
| 其它 workflow | `publish.yml`（PyPI）、`ruff.yml` | 暂无（纯 JS 课程，无 PyPI 包） |

### 本地对照 CI

```bash
npm ci
pip install pillow   # 与 CI 一致
npm run build
npx vitepress preview docs
# 打开 http://localhost:4173/bagent/
```

## 发布插件（GitHub Release）

用户**不用 clone / compile**：从 [Releases](https://github.com/SyncLionPaw/bagent/releases) 下载 `bagent-plugin.vsix`，配 Key 即用。安装说明见 [安装插件](/guide/install-plugin)。

维护者发版步骤：

1. 改 `lessons/53-diff-preview/package.json` 里的 **`version`**
2. 提交并 push 到 `main`
3. 打 tag 并推送（tag 与 version 对齐，例如 `v0.0.2`）：

```bash
git tag v0.0.2
git push origin v0.0.2
```

4. Actions 里 **Release** workflow 会自动 `ch53:package`，上传 `bagent-plugin.vsix` 与带版本号的 `.vsix`

也可在 Actions 页 **Run workflow** 手动触发（需已有 tag 或会用到当前 ref；推荐仍用 tag 发版）。

本地试打：

```bash
npm run ch53:package
```

### 常见问题

- **404 / 空白页**：Pages 是否指向 **`gh-pages` + root**；`config.mts` 的 `base` 是否为 `/bagent/`（与仓库名一致）。
- **图标还是旧的**：确认 `image.png` 已进仓库；合并后看 Actions 是否成功；浏览器强刷缓存。
- **Actions 报 permission denied**：回到步骤 1 打开 **Read and write**。
- **sync-brand 失败**：CI 需要根目录 `image.png`；本地可先 `npm run sync-brand` 自检。
