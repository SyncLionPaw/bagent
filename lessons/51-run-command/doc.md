# 第 51 课 · run_command 白名单命令

**约 20 分钟** · [第 50 课](/chapters/50-delete-file) 之后 · **独立插件**

文件工具能读能写能删，但 Agent 还缺一类能力：**看外面世界和本机运行时**——接口通不通、端口谁占着、进程在不在。本课在 [第 50 课](/chapters/50-delete-file) 之上增加 **`run_command`**：白名单内**仅三条观测命令**——`curl`、`ps`、`lsof`。

`npm run`、`git`、`node`、`python` 等**编译/运行类**本课不做，留给后续**沙箱课**统一处理。

第 51 课是**截至目前的完整插件课**：前面各课的 `web_search`、`read_file`（行号）、`str_replace`、`delete_file`、对话保存、plan 等都在，本课再补上 `run_command`。

三个真实用法（查资料写页、前端精修、C 多文件实现）见站点 **[Agent 能做什么](/guide/showcase)**——横跨多课，不限于本课。

---

## 1. 白名单：观测三件套

| 命令 | 典型用法 | 干什么 |
|------|----------|--------|
| **`curl`** | `curl -sI https://api.example.com/health` | 探测 HTTP(S) 是否通、看响应头 |
| **`ps`** | `ps aux`、`ps -p 1234` | 看进程是否在跑 |
| **`lsof`** | `lsof -i :3000` | 看谁占了端口 |

`curl` 限制：须有 `http(s)://` URL；仅 GET/HEAD；禁止 `-o` 写盘、POST、上传。

`lsof` 限制：禁止 `-r` 持续轮询。

---

## 2. 刻意不放什么

| 类别 | 例子 | 去哪 |
|------|------|------|
| 文件读写搜 | `ls`、`cat`、`grep` | 专用工具 |
| 终端编辑/改文件 | `vim`、`nano`、`sed`、`tee` | `write_file` / `str_replace` / `delete_file` |
| 编译/测试/跑脚本 | `npm`、`node`、`tsc`、`python` | **后续沙箱课** |
| 改仓库 | `git commit` | 沙箱课 |
| 删文件 | `rm` | `delete_file` |

命中 `npm` / `git` / `node` 等会提示：**将在后续沙箱课开放**。

---

## 3. 硬性规则

- 不启 shell；禁止 `| ; & $` 重定向
- cwd 固定为工作区根目录
- 超时 120s；输出上限 16000 字符
- **每次须用户审批**（侧栏 danger）

---

## 4. 参数与返回

| 参数 | 作用 |
|------|------|
| `command` | 完整命令一行 |

```json
{
  "ok": true,
  "command": "curl -sI https://example.com",
  "exitCode": 0,
  "output": "[exit: 0]\nHTTP/2 200 ..."
}
```

---

## 5. 代码位置

| 文件 | 作用 |
|------|------|
| `agent/runCommand.ts` | 白名单、`DEFERRED_SANDBOX_PROGRAMS`、`runCommand()` |
| `agent/tools.ts` | 工具定义与 before 钩子 |

---

## 6. 动手

```bash
npm run ch51:compile
```

1. **F5** 启动插件
2. `curl -sI https://example.com` → 审批 → 看响应头
3. `lsof -i :某端口` 或 `ps aux`
4. `npm run compile` → 应提示留给沙箱课
5. `ls .` → 应提示用 `ls` 工具；`vim foo.txt` → 应提示用 `write_file` / `str_replace`

---

## 检查点

- [ ] 读过 [Agent 能做什么](/guide/showcase) 三个案例？
- [ ] `curl` / `ps` / `lsof` 可执行？
- [ ] `npm` / `git` / `node` 提示沙箱课？
- [ ] `ls` / `grep` 提示专用工具？
- [ ] 审批框为 danger？

---

[← 第 50 课](/chapters/50-delete-file)
