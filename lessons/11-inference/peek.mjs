// 约定：已 export DEEPSEEK_API_KEY；thinking 开启以便看到 reasoning_content
// 文档：https://api-docs.deepseek.com/zh-cn/guides/thinking_mode
const res = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: "用一句话回答。" },
      { role: "user", content: "apple里面有几个o" },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  }),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
