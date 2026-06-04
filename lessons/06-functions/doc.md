# 第 6 课 · 封装函数

**约 15 分钟** · 第 5 课之后：把重复的 **调 API** 收成函数，主流程只关心聊天

## 为什么要拆

从第 4 课起，每个 `chat.mjs` 里都有一大段相同的 `fetch` + `res.json()`。  
终端循环、`messages` 的 `push` 是**聊天流程**；请求 DeepSeek 是**另一件事**——拆开后：

- `chat.mjs`：读输入、维护历史、打印  
- `ask.mjs`：只负责「传入 `messages`，返回模型正文」

以后改流式、加工具，多半只动 `ask.mjs`，不用重写整个循环。

## 文件分工

| 文件 | 职责 |
|------|------|
| [`ask.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/06-functions/ask.mjs) | `export async function chat(messages)` |
| [`chat.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/06-functions/chat.mjs) | `import { chat } from "./ask.mjs"`，跑多轮终端 |

## ask.mjs

```javascript
export async function chat(messages) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages,
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    }),
  });

  const data = await res.json();
  return data.choices[0].message.content;
}
```

函数入参是**整段** `messages` 数组；返回值是**字符串**（assistant 正文），调用方自己 `push` 进历史。

## chat.mjs（主流程变薄）

```javascript
import { chat } from "./ask.mjs";

// … readline、messages 初始化 …

messages.push({ role: "user", content: user });
const content = await chat(messages);
messages.push({ role: "assistant", content });
console.log("AI:", content);
```

行为和 `npm run ch04` 一致，只是 HTTP 细节搬进了 `ask.mjs`。

## 和第 4 课对比

| | 第 4 课 | 第 6 课 |
|--|--------|--------|
| 多轮 + 历史 | 有 | 有 |
| `fetch` 位置 | 写在 `while` 里 | 在 `ask.mjs` 的 `chat()` 里 |
| 主文件行数 | 更长 | 更短 |

## 运行

```bash
npm run ch06
```

## 检查点

- [ ] `ask.mjs` 是否 `export` 了 `chat`？  
- [ ] `chat.mjs` 是否用 `import { chat } from "./ask.mjs"`？  
- [ ] 多轮对话效果是否与第 4 课相同？  

## 下一课

[第 7 课 · Tool Calls](/chapters/07-tool-calls)：请求里加 `tools`，由你的代码执行函数。

[← 第 5 课](/chapters/05-system-prompt) · [第 4 课](/chapters/04-multi-round)
