# 第 3 课 · 终端循环提问（不带历史）

**约 15 分钟** · 第 2 课之后：可以一直问，但**每一轮都是新对话**

## 目标

终端里**循环**：

- 反复输入问题 → 模型回答  
- 输入 `/quit` 或 `exit` 退出  
- **不**把上一轮的问答放进下一轮请求的 `messages`

所以模型**记不住**你刚才说了什么——这是本课故意为之，下一课才做「带历史的对话」。

## 约定

- 已完成 [第 2 课](/chapters/02-terminal-chat)  
- `DEEPSEEK_API_KEY` 已 export  

## 和第 2 课的区别

| | 第 2 课 | 第 3 课 |
|--|--------|--------|
| 次数 | 问 1 次就结束 | `while` 循环，可问多次 |
| `messages` | 当前这句 | **仍然只有** `system` + 当前 `user` |
| 上下文 | — | 不保存上一轮对话 |

## 代码

[`chat.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/03-chat-loop/chat.mjs)

```javascript
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });

while (true) {
  const user = await rl.question("你: ");
  if (user === "/quit" || user === "exit") break;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "用一句话回答用户。" },
        { role: "user", content: user },
      ],
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    }),
  });

  const data = await res.json();
  console.log("AI:", data.choices ? data.choices[0].message.content : data);
}

rl.close();
```

## 运行

```bash
npm run ch03
```

试两句相关的问题（例如先问「我叫小明」，再问「我叫什么」）——第二轮**不应**记得小明，因为没把历史传回去。

## 检查点

- [ ] 输入 `/quit` 能退出吗？  
- [ ] 每轮请求的 `messages` 长度是否始终为 2（`system` + 一个 `user`）？  
- [ ] 模型是否表现出「不记得上一轮」？  

## 下一课

[第 4 课 · 多轮对话（带历史）](/chapters/04-multi-round) — 对照 [DeepSeek 官方说明](https://api-docs.deepseek.com/zh-cn/guides/multi_round_chat)。

[← 第 2 课](/chapters/02-terminal-chat) · [第 1 课](/chapters/01-deepseek)
