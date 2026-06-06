import type { AgentEvent } from "./events";
import type { AssistantMessage, Messages, ToolCall } from "./messages";
import { toolDefinitions } from "./tools";

export async function* streamEvents(
  history: Messages,
): AsyncGenerator<AgentEvent, AssistantMessage> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: history,
      tools: toolDefinitions,
      stream: true,
      thinking: { type: "disabled" },
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  if (!res.body) throw new Error("响应没有 body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  const toolParts: Partial<ToolCall>[] = [];

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

      const json = JSON.parse(data) as {
        choices?: {
          delta?: {
            content?: string;
            tool_calls?: {
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }[];
          };
        }[];
      };

      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        yield { type: "ChunkUpdated", text: delta.content };
      }

      for (const part of delta.tool_calls ?? []) {
        const slot = toolParts[part.index] ?? {
          id: "",
          type: "function" as const,
          function: { name: "", arguments: "" },
        };
        if (part.id) slot.id = part.id;
        if (part.function?.name) slot.function!.name += part.function.name;
        if (part.function?.arguments) {
          slot.function!.arguments += part.function.arguments;
        }
        toolParts[part.index] = slot;
      }
    }
  }

  const tool_calls = toolParts.filter((t) => t.id && t.function?.name) as ToolCall[];

  return {
    role: "assistant",
    content: content || (tool_calls.length ? null : ""),
    ...(tool_calls.length ? { tool_calls } : {}),
  };
}
