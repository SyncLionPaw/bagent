# 第 2 课 · 终端一问一答

**约 15 分钟** · 第 1 课之后：把「写死的 prompt」换成「用户输入」

## 目标

在终端里：

1. 程序问你一句话  
2. 你输入  
3. 大模型回一句话  
4. 程序结束（**不**做循环聊天）

## 约定

- 已完成 [第 1 课](/chapters/01-deepseek)（会调 DeepSeek API）  
- `DEEPSEEK_API_KEY` 已 export  

## 新增知识点

| 点 | 说明 |
|----|------|
| `readline/promises` | Node 内置，读终端一行输入 |
| `messages` | `user` 内容来自你的输入，不再是代码里的常量 |

## 代码

[`chat.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/02-terminal-chat/chat.mjs)

```javascript
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });
const user = await rl.question("你: ");
rl.close();

const res = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: "用一句话回答用户，然后结束。" },
      { role: "user", content: user },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  }),
});

const data = await res.json();
console.log("AI:", data.choices ? data.choices[0].message.content : data);
```

和第 1 课相比：多了**读终端**，`user` 消息**来自输入**；请求发完、打印完就退出。

## 运行

```bash
npm run ch02
node lessons/02-terminal-chat/chat.mjs
```

运行效果：

![终端一问一答](/lessons/02-terminal-chat/chat.png)

## 检查点

- [ ] `rl.question` 阻塞等待的是你的输入吗？  
- [ ] API 里 `messages[1].content` 是否等于你刚输入的那句？  
- [ ] 程序有没有在回复后自动退出（没有 while 循环）？  

## 下一课

[第 3 课 · 终端循环提问](/chapters/03-chat-loop)：可问多次，输入 `/quit` 退出；仍不传历史。

[← 第 1 课](/chapters/01-deepseek) · [第 0 章](/chapters/00-preface)
