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
  if (!message) {
    console.error(data);
    throw new Error("API 未返回 choices[0].message");
  }
  if (process.env.DEBUG) console.log(JSON.stringify(message, null, 2));
  return message;
}
