import type { AssistantMessage, Messages } from "./messages.js";
import { toolDefinitions } from "./tools.js";

export async function complete(history: Messages): Promise<AssistantMessage> {
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
      thinking: { type: "disabled" },
    }),
  });

  const data = (await res.json()) as {
    choices?: { message?: AssistantMessage }[];
    error?: { message?: string };
  };
  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error(data.error?.message ?? JSON.stringify(data));
  }
  return message;
}
