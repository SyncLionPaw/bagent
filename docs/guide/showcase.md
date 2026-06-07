# Agent 能做什么

三个在 **VS Code / Cursor 插件**里跑出来的真实对话截图。它们**不只属于第 51 课**——分别用到 [第 45 课](/chapters/45-web-search) 联网、[第 49 课](/chapters/49-str-replace) 局部改、[第 46 课](/chapters/46-reminder-injection) plan 等；叠到 [第 51 课](/chapters/51-run-command) 插件上，就是目前课程里**最完整的一档代码 Agent**。

自己试：从 [第 40 课](/chapters/40-vscode-kernel-upgrade) 起跟到第 51 课，或 `npm run ch51:compile` 后 F5 打开 `lessons/51-run-command`。

---

## 总览

| 案例 | 任务 | 主要工具 | 相关课文 |
|------|------|----------|----------|
| A · 情书账本 | 查公开资料，写 HTML 小报 | `web_search` → `write_file` | [45](/chapters/45-web-search)、[43](/chapters/43-write-file) |
| B · 京都食帖 | 精修已有美食地图页 | `str_replace` | [49](/chapters/49-str-replace)、[48](/chapters/48-read-lines) |
| C · Swiss Table | 用 C 实现哈希表并测试 | `plan_operate` → `write_file` | [46](/chapters/46-reminder-injection)、[43](/chapters/43-write-file) |

写文件、改代码、查资料——**不必等后续沙箱课**。编译运行（`gcc`、`npm test`）仍建议在本地终端或等沙箱课再接上。

---

## 案例 A：查资料 + 写页面

![web_search 查票房与投资信息，再 write_file 生成 HTML](/showcase/ama.png)

用户要一份电影投资主题的 HTML 小报（《一封情书的账本》）。Agent 先用 **`web_search`** 查票房、成本、出品方、赞助商等公开信息，再 **`write_file`** 落成 `amam-report.html`——预览里的数字与机构名来自检索，不是瞎编。用户再说「艺术表达可以更大胆」，Agent 规划改字体、配色、破网格。

**侧重点是 search → write。**

---

## 案例 B：局部改前端

![str_replace 调圆角、加广告与分享按钮](/showcase/foodmap.png)

京都美食地图 `food-map.html` 已能跑（地图、餐厅卡片、评论）。用户提 UI：悬浮卡片圆角再精致一点、加点广告和社媒分享。Agent 连续 **`str_replace`** 改 CSS（`border-radius: 20px` → `10px` → `8px`），每次审批、只动匹配片段。

**侧重点是 read（行号）+ exact match 改代码。**

---

## 案例 C：多文件写 C

![plan 拆步 + write_file 写 swisstable.h/.c 与测试](/showcase/swiss.png)

用户：「用 C 实现一个简单的 swisstable，并测试」。Agent **`plan_operate`** 拆三步：头文件 → 实现 → 测试与 benchmark；侧栏里逐步 **`write_file`** 落盘。终端里是本地 `gcc` 跑出的测试结果——Agent 负责写与拆任务，编译执行由你在终端完成（或等沙箱课）。

**侧重点是 plan + 多文件写入，语言不限于前端。**

---

## 还想继续

| 方向 | 入口 |
|------|------|
| 从零跟课 | [怎么学](/guide/how-to-learn) · [第 1 课](/chapters/01-deepseek) |
| 插件内核 | [第 40 课](/chapters/40-vscode-kernel-upgrade) → [第 51 课](/chapters/51-run-command) |
| 维护本站 | [维护文档站](/development) |
