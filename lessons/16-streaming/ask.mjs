export async function streamChat(messages) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages,
      stream: true,
      thinking: { type: "disabled" },
    }),
  });

  process.stdout.write("AI: ");
  let reply = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      const chunk = JSON.parse(data);
      const piece = chunk.choices?.[0]?.delta?.content;
      if (piece) {
        reply += piece;
        process.stdout.write(piece);
      }
    }
  }
  process.stdout.write("\n");
  return reply;
}
