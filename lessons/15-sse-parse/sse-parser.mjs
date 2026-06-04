// 用 eventsource-parser：业界常见写法，处理粘包/拆行更稳
import { createParser } from "eventsource-parser";

export async function consumeSSE(res, onPiece) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let reply = "";

  const parser = createParser((event) => {
    if (!event.data || event.data === "[DONE]") return;
    const chunk = JSON.parse(event.data);
    const piece = chunk.choices?.[0]?.delta?.content;
    if (piece) {
      reply += piece;
      onPiece(piece);
    }
  });

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }

  return reply;
}
