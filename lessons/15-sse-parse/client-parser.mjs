// 先 ch14:server；本脚本：eventsource-parser
import { consumeSSE } from "./sse-parser.mjs";

const base = process.env.CH14_URL ?? "http://127.0.0.1:8014";
const user = process.argv[2] ?? "对比库解析";

const res = await fetch(`${base}/chat/stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages: [{ role: "user", content: user }] }),
});

if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

console.log("模式: eventsource-parser\n");
process.stdout.write("AI: ");
const reply = await consumeSSE(res, (piece) => process.stdout.write(piece));
process.stdout.write(`\n\n（${reply.length} 字）\n`);
