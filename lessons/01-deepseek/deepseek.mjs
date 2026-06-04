// 约定：已 export 有效的 DEEPSEEK_API_KEY
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
      { role: "system", content: "简单地续写几句话" },
      { role: "user", content: head },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  }),
});

const data = await res.json();
const msg = data.choices?.[0]?.message;
console.log(data.choices ?  msg.content : data);
