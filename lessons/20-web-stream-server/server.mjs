// 约定：export DEEPSEEK_API_KEY；浏览器打开提示的地址
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT) || 3020;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function wrapSSE(content) {
  const payload = {
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

async function serveStatic(req, res) {
  const url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(publicDir, path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, ""));
  if (!file.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const body = await fs.readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

async function proxyStream(messages, res) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "缺少 DEEPSEEK_API_KEY" }));
    return;
  }

  const upstream = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages,
      stream: true,
      thinking: { type: "disabled" },
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    res.writeHead(upstream.status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: text }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const reader = upstream.body.getReader();
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
      if (data === "[DONE]") {
        res.write("data: [DONE]\n\n");
        continue;
      }
      const piece = JSON.parse(data).choices?.[0]?.delta?.content;
      if (piece) res.write(wrapSSE(piece));
    }
  }

  res.write("data: [DONE]\n\n");
  res.end();
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat/stream") {
    try {
      const raw = await readBody(req);
      const { messages } = JSON.parse(raw || "{}");
      const history = Array.isArray(messages) ? messages : [];
      if (!history.length || history[0]?.role !== "system") {
        history.unshift({ role: "system", content: "简洁回答用户。" });
      }
      await proxyStream(history, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.end();
      }
    }
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  第 20 课 · Node 网页流式网关

  代理 DeepSeek SSE → 浏览器真打字机
  需要 DEEPSEEK_API_KEY

  浏览器打开：http://localhost:${port}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`端口 ${port} 已被占用。可先执行：lsof -ti :${port} | xargs kill`);
    process.exit(1);
  }
  throw err;
});
