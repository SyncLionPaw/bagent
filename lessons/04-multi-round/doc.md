# 第 4 课 · 多轮对话（带历史）

**约 15 分钟** · 第 3 课之后：同一终端里连续聊，且**记得上文**

## 官方说明

DeepSeek 的 Chat API 是**无状态**的：服务端不保存你上一轮的聊天内容。  
每一轮请求都要把**至今为止的完整对话**放进 `messages`。

必读：[DeepSeek 多轮对话](https://api-docs.deepseek.com/zh-cn/guides/multi_round_chat)

核心就两步（与官方 Python 示例一致，这里改成 JS）：

1. 每轮先把用户输入 `push` 进 `messages`
2. 收到回复后，把 **assistant** 那条也 `push` 进 `messages`，下一轮原样再发给 API

## 和第 3 课的区别

| | 第 3 课 | 第 4 课 |
|--|--------|--------|
| 循环 | 有 | 有 |
| 每轮 `messages` | 只有当前一句 | **累积**全部 user / assistant |
| 能否追问「刚才说的」 | 不能 | 能 |

## 代码

[`chat.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/04-multi-round/chat.mjs)

```javascript
const messages = [{ role: "system", content: "简洁回答用户。" }];

// 循环里：
messages.push({ role: "user", content: user });

const res = await fetch("https://api.deepseek.com/chat/completions", {
  // ...
  body: JSON.stringify({
    model: "deepseek-v4-flash",
    messages,
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  }),
});

const data = await res.json();
const reply = data.choices[0].message;
messages.push({ role: "assistant", content: reply.content });
console.log("AI:", reply.content);
```

第二轮时 `messages` 大致形如官方文档中的：

```json
[
  {"role": "system", "content": "简洁回答用户。"},
  {"role": "user", "content": "世界上最高的山是哪座？"},
  {"role": "assistant", "content": "……"},
  {"role": "user", "content": "第二高的呢？"}
]
```

## 运行

```bash
npm run ch04
```

下面是一次真实运行（`npm run ch04`）。注意第三轮：你只说了「推测我的身份」，模型却用上了前两轮的「晓阳」和「山葵酱」——因为那些内容已经留在 `messages` 里一并发给了 API。

```
❯ npm run ch04

> ch04
> node lessons/04-multi-round/chat.mjs

你: 我叫晓阳
AI: 晓阳你好，很高兴认识你！有什么我可以帮你的吗？😊
你: 我喜欢吃山葵酱
AI: 哇，晓阳你喜欢山葵酱啊！那种独特的辛辣味确实很过瘾，尤其是搭配刺身或寿司时，能瞬间提升味觉体验。你是喜欢那种现磨的新鲜山葵，还是管装的加工山葵酱呢？平常会用它来搭配哪些美食呀？😄
你: 推测我的身份
AI: 根据你提到的名字「晓阳」以及你对山葵酱的喜爱——尤其是能区分现磨山葵和管装加工山葵，这通常表明你对日式料理有比较深入的了解，不是偶尔尝鲜的程度。综合来看，我推测你可能是一位：

**注重生活品质、对美食颇有研究的美食爱好者**，或者是一位**经常有机会品尝日料的都市白领/学生**（可能居住在一二线城市）。

当然，也可能你是一位**日式料理的从业者**，或者正在**学习饮食文化相关专业**的人。

你觉得这个推测准不准？还想要我再猜得更具体一点吗？😄
你: /quit
```

同一套对话在第 3 课（每轮只发当前一句）里，第三轮模型**看不到**前两轮；换到第 4 课才会出现上面的效果。

也可以按[官方示例](https://api-docs.deepseek.com/zh-cn/guides/multi_round_chat)试：先问「最高的山」，再追问「第二高的呢」。

## 检查点

- [ ] 每轮请求里 `messages` 是否在变长？  
- [ ] 是否包含成对的 `user` / `assistant`？  
- [ ] 第三轮只说一句模糊指令（如「推测我的身份」）时，模型能否用上更早的 user / assistant？  

## 下一课

[第 5 课 · 系统提示词的作用](/chapters/05-system-prompt)

[← 第 3 课](/chapters/03-chat-loop) · [官方文档](https://api-docs.deepseek.com/zh-cn/guides/multi_round_chat)
