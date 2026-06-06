import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AgentEvent } from "./events.js";
import { AgentLoop } from "./loop.js";

const PORT = Number(process.env.PORT) || 3028;
const agent = new AgentLoop();

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function publishEvent(res: ServerResponse, event: AgentEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("请先 export DEEPSEEK_API_KEY（在 server 进程）");
  process.exit(1);
}

createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/chat") {
    let message: string;
    try {
      const body = JSON.parse(await readBody(req)) as { message?: string };
      message = body.message?.trim() ?? "";
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("invalid json");
      return;
    }
    if (!message) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("message required");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      for await (const event of agent.turn(message)) {
        publishEvent(res, event);
      }
      res.write("data: [DONE]\n\n");
    } catch (err) {
      publishEvent(res, {
        type: "TurnEnd",
        text: `错误: ${err instanceof Error ? err.message : String(err)}`,
      });
      res.write("data: [DONE]\n\n");
    }
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, history: agent.history.length }));
    return;
  }

  res.writeHead(404);
  res.end("POST /chat  SSE 订阅 AgentEvent");
}).listen(PORT, () => {
  console.log(`Agent 发布端 http://localhost:${PORT}`);
  console.log("POST /chat  body: { \"message\": \"...\" }  → text/event-stream");
});
