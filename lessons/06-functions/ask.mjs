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
