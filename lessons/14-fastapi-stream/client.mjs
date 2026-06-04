// 消费假数据 SSE（手写 decode）；先 npm run ch14:server
// 解析对照见第 15 课 sse-hand.mjs / sse-parser.mjs
const base = process.env.CH14_URL ?? "http://127.0.0.1:8014";
const user = process.argv[2] ?? "随便发一句，服务端会用假数据逐字回复。";

const res = await fetch(`${base}/chat/stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: user }],
  }),
});

if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

console.log(`← ${base}/chat/stream  (${res.headers.get("content-type")})\n`);
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
console.log(`\n（假数据流结束，共 ${reply.length} 字）`);
