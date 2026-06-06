import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "./color.js";
import type { AgentEvent } from "./events.js";
import { handleTerminalEvent } from "./terminal.js";

const BASE = process.env.AGENT_URL ?? "http://localhost:3028";

async function subscribeTurn(message: string): Promise<void> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    console.error(await res.text());
    return;
  }
  if (!res.body) {
    console.error("无响应体");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const uiState = { aiOpen: false };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      const event = JSON.parse(data) as AgentEvent;
      handleTerminalEvent(event, uiState);
    }
  }
}

const rl = createInterface({ input: stdin, output: stdout });

console.log(`Agent 订阅端 → ${BASE}`);
console.log("两个进程：先另开终端 npm run ch28:server\n");

while (true) {
  const user = await rl.question(`${color.user("你:")} `);
  if (user === "/quit" || user === "exit") break;
  if (!user.trim()) continue;

  try {
    await subscribeTurn(user);
    console.log(color.meta(""));
  } catch (err) {
    console.error("连接失败，server 开了吗？", err);
  }
}

rl.close();
