import type { AgentEvent } from "./events";
import type { AssistantMessage, Message, Messages, ToolCall } from "./messages";
import { augmentUserMessage } from "./reminder.js";
import { getToolDefinitions } from "./tools";

const API_TIMEOUT_MS = 60_000;

/** history 存干净用户文本；仅构建 API payload 时给最新 user 消息加 reminder */
function messagesForApi(history: Messages): Message[] {
  let lastUserIdx = -1;
  let userTurn = 0;
  for (let i = 0; i < history.length; i++) {
    if (history[i].role === "user") lastUserIdx = i;
  }

  return history.map((msg, i) => {
    if (msg.role !== "user") return msg;
    const turnIndex = userTurn++;
    if (i !== lastUserIdx) return msg;
    return { ...msg, content: augmentUserMessage(msg.content, turnIndex) };
  });
}

export async function* streamEvents(
  history: Messages,
): AsyncGenerator<AgentEvent, AssistantMessage> {
  let res: Response;
  try {
    res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
        messages: messagesForApi(history),
        tools: getToolDefinitions(),
        stream: true,
        thinking: { type: "enabled" },
        reasoning_effort: "high",
      }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`无法连接 DeepSeek API：${detail}`);
  }

  if (!res.ok) throw new Error(await res.text());
  if (!res.body) throw new Error("响应没有 body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  let reasoning = "";
  let thinkingOpen = false;
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
            reasoning_content?: string;
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

      if (delta.reasoning_content) {
        reasoning += delta.reasoning_content;
        if (!thinkingOpen) {
          yield { type: "ThinkingStart" };
          thinkingOpen = true;
        }
        yield { type: "ThinkingUpdated", text: delta.reasoning_content };
      }

      if (delta.content) {
        if (thinkingOpen) {
          yield { type: "ThinkingEnd" };
          thinkingOpen = false;
        }
        content += delta.content;
        yield { type: "ChunkUpdated", text: delta.content };
      }

      for (const part of delta.tool_calls ?? []) {
        if (thinkingOpen) {
          yield { type: "ThinkingEnd" };
          thinkingOpen = false;
        }
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

  if (thinkingOpen) yield { type: "ThinkingEnd" };

  const tool_calls = toolParts.filter((t) => t.id && t.function?.name) as ToolCall[];

  return {
    role: "assistant",
    content: content || (tool_calls.length ? null : ""),
    ...(reasoning ? { reasoning_content: reasoning } : {}),
    ...(tool_calls.length ? { tool_calls } : {}),
  };
}
