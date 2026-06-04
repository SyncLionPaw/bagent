# 第 1 课 · DeepSeek API 续写

**约 15 分钟** · 路线第一步：在 JS 里调通大模型

## 目标

用 Node **`fetch`** 调用 DeepSeek **`chat/completions`**，让模型续写一句话 —— 这是后续 Agent 里「模型说话」的最小单元。

## 约定

- Node **20+**
- 已 `export DEEPSEEK_API_KEY=sk-...`（须有效；Node 不会自动读 `.env`）
- Key **不进仓库**

## 官方请求形态（curl）

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  -d '{
    "model": "deepseek-v4-flash",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "thinking": {"type": "enabled"},
    "reasoning_effort": "high"
  }'
```

本课把 `messages` 改成续写场景，其余字段与上一致。

## 代码

[`deepseek.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/01-deepseek/deepseek.mjs)

```javascript
const head = "从前有一座山，";

const res = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: "你只续写用户给出的开头，只输出续写部分。" },
      { role: "user", content: head },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  }),
});

const data = await res.json();
const msg = data.choices?.[0]?.message;
console.log(data.choices ? head + msg.content : data);
```

| 字段 | 本课含义 |
|------|----------|
| `deepseek-v4-flash` | 当前文档示例模型 |
| `system` / `user` | 系统指令 + 待续写开头 |
| `thinking` | 开启思考（推理在服务端，正文仍在 `content`） |
| `reasoning_effort` | 思考强度 `high` |

## 运行

```bash
export DEEPSEEK_API_KEY="sk-你的密钥"
npm run ch01
```

可改 `head` 或 `reasoning_effort`（如 `"medium"`）对比效果。

## 检查点

- 请求 URL、方法与 curl 是否一致？
- `messages` 里 `system` 和 `user` 各说什么？
- 续写在响应的哪个字段？（`choices[0].message.content`）

## 下一课

[第 2 课 · 终端一问一答](/chapters/02-terminal-chat)

[← 第 0 章](/chapters/00-preface) · [环境](/guide/environment)
