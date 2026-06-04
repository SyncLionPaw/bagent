// 约定：export DEEPSEEK_API_KEY 与 TAVILY_API_KEY；浏览器打开提示的地址
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTurn, systemMessage } from "./agent.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT) || 3100;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
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

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    try {
      const raw = await readBody(req);
      const { messages } = JSON.parse(raw || "{}");
      const history =
        Array.isArray(messages) && messages.length
          ? messages
          : [systemMessage];
      if (history[0]?.role !== "system") {
        history.unshift(systemMessage);
      }
      const result = await runTurn(history);
      json(res, result);
    } catch (err) {
      json(res, { error: err.message }, 500);
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
  🎉 第 10 课 · 第一阶段完结

  和第 8、9 课同一个 Agent，换成网页聊
  需要 DEEPSEEK_API_KEY + TAVILY_API_KEY

  在浏览器打开：
  http://localhost:${port}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});
