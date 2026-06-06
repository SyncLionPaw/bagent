import type { AgentEvent } from "./events";

/** 订阅第 28 课 POST /chat 的 SSE，每收到一个事件调用 onEvent */
export async function subscribeChat(
  baseUrl: string,
  message: string,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  if (!res.body) {
    throw new Error("响应没有 body");
  }

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
      if (data === "[DONE]") return;
      onEvent(JSON.parse(data) as AgentEvent);
    }
  }
}
