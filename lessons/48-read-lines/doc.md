# 第 48 课 · read_file 行号

**约 20 分钟** · [第 47 课](/chapters/47-chat-save) 之后 · **独立插件**

编码场景里 Agent 需要知道「第几行」。此前 `read_file` 只返回裸文本，模型只能自己数行；大文件又被通用截断切成首尾两段，难以翻页。本课在 [第 47 课](/chapters/47-chat-save) 之上：**纯文本每行带 1-based 行号**、**`offset` / `limit` 按行切片**，并对超长按**行对齐截断 + 续读提示**。

---

## 1. 输出格式

```text
   1|import { foo } from "./foo.js";
   2|
   3|export function bar() {
   4|  return foo();
   5|}
```

- 行号右对齐，与正文用 `|` 分隔（与 `grep` 的 `file:line:` 互补）
- 只读片段时首行提示：`(lines 10-40 of 256)`

---

## 2. 截断与翻页

第 36 课起，工具输出有 **8000 字符**上限；超出时通用钩子 `truncateMiddle` 会**保留首尾、丢掉中间**。

对 `read_file` 这有问题：不传 `offset` 时每次读到的是同一段首尾，中间行号全丢，模型很难知道下一页该从哪行续读——`offset` 参数在，但翻页几乎用不上。

本课对**纯文本行号输出**改用专用逻辑：

| 旧（通用） | 新（本课 `read_file`） |
|------------|------------------------|
| 首尾拼接，中间省略 | **只保留开头连续完整行** |
| 截断说明只有字符数 | 文末写明总行数、已显示行段、**下一页 `offset`** |
| 重复读同一路径，视图不变 | `offset=上一页末行+1` 可逐段读完 |

超出上限时的文末提示示例：

```text
[已截断：共 500 行，已显示第 1-236 行；继续请 read_file(path, offset=237)]
```

下一调用 `read_file(path, offset=237)` 从第 237 行接着读，与上一段不重叠。

实现要点：

- `sliceAndNumberCapped()`：在编号前用二分算出「最多能放下几行」，保证不截断半行
- `readFileTruncateAfter()`：替换 `read_file` 的通用 `truncateAfter`；识别行号格式后走 `truncateNumberedLinesHead`
- PDF / Excel / 二进制 hint 等非行号输出仍走 `truncateMiddle`，行为与第 47 课一致

---

## 3. 工具参数

| 参数 | 作用 |
|------|------|
| `path` | 绝对路径（必填） |
| `offset` | 从第几行开始（1-based，默认 1） |
| `limit` | 最多读多少行 |

示例：读 `src/tools.ts` 第 100–150 行 → `offset: 100, limit: 51`。

PDF / Excel 等仍走第 44 课分发逻辑，**不加行号**（提取文本结构不同）。

---

## 4. 代码位置

| 文件 | 作用 |
|------|------|
| `agent/readFile.ts` | 行号格式化、`sliceAndNumber()`、`sliceAndNumberCapped()`、`readFileTruncateAfter()` |
| `agent/tools.ts` | `read_file` 参数、hook、`runReadFile()` |

---

## 5. 与前后课程

- **第 47 课**：对话保存、plan、reminder 等
- **第 48 课**：fork 47 + 行号 read + 行对齐截断；**不修改** 40–47

---

## 6. 动手

```bash
npm run ch48:compile
```

1. 打开 **`lessons/48-read-lines`** → **F5**
2. 让 Agent `read_file` 读一个 `.ts` 文件
3. 工具结果里应出现 `  1|`、`  2|` 前缀
4. 大文件：先看是否出现截断提示与 `offset=…`；再让 Agent 用该 `offset` 续读下一段

---

## 检查点

- [ ] 纯文本 `read_file` 每行有行号？
- [ ] `offset` / `limit` 只返回指定行段？
- [ ] 超大文件截断后是**开头连续行** + 续读 `offset`，不是首尾拼接？
- [ ] `grep` 仍返回 `path:line:内容`？
- [ ] PDF/图片仍走 hint，不强行加行号？

---

[← 第 47 课](/chapters/47-chat-save)
