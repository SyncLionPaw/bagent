import { tools } from "./tools.mjs";

export async function complete(messages) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages,
      tools,
      thinking: { type: "disabled" },
    }),
  });

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  if (message) return message;

  if (data.error) {
    return {
      role: "assistant",
      content: `DeepSeek 未生成回答：${data.error.message}（若为 Content Exists Risk，多为内容审核；工具结果已截断，可换中性问法重试）`,
    };
  }

  console.error(data);
  return { role: "assistant", content: "API 响应异常，请检查 Key 或稍后重试。" };
}
