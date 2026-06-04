// 先 ch14:server；本脚本：手写 decode（与第 14 课 client.mjs 同思路）
import { consumeSSE } from "./sse-hand.mjs";

const base = process.env.CH14_URL ?? "http://127.0.0.1:8014";
const user = process.argv[2] ?? "对比手写解析";

const res = await fetch(`${base}/chat/stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages: [{ role: "user", content: user }] }),
});

if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

console.log("模式: 手写 buf + split('\\n') + data:\n");
process.stdout.write("AI: ");
const reply = await consumeSSE(res, (piece) => process.stdout.write(piece));
process.stdout.write(`\n\n（${reply.length} 字）\n`);
