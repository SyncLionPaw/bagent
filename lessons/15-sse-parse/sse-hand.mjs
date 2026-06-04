// 手写 SSE 解析：教学用，看清每一行在干什么

export async function consumeSSE(res, onPiece) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let reply = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;

      const chunk = JSON.parse(payload);
      const piece = chunk.choices?.[0]?.delta?.content;
      if (piece) {
        reply += piece;
        onPiece(piece);
      }
    }
  }

  return reply;
}
