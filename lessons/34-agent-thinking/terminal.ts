import { color } from "./color.js";
import type { AgentEvent } from "./events.js";

export function handleTerminalEvent(
  event: AgentEvent,
  state: { aiOpen: boolean; thinkingOpen: boolean },
): void {
  switch (event.type) {
    case "TurnStart":
      state.aiOpen = false;
      state.thinkingOpen = false;
      break;

    case "ThinkingStart":
      process.stdout.write(color.thinking("【思考】 "));
      state.thinkingOpen = true;
      break;

    case "ThinkingUpdated":
      process.stdout.write(color.thinking(event.text));
      break;

    case "ThinkingEnd":
      if (state.thinkingOpen) process.stdout.write("\n");
      state.thinkingOpen = false;
      break;

    case "ChunkUpdated":
      if (!state.aiOpen) {
        process.stdout.write(color.ai("AI: "));
        state.aiOpen = true;
      }
      process.stdout.write(color.ai(event.text));
      break;

    case "ToolCallStart":
      if (state.aiOpen || state.thinkingOpen) process.stdout.write("\n");
      state.aiOpen = false;
      state.thinkingOpen = false;
      console.log(color.tool(`[工具] ${event.name}(${event.arguments})`));
      break;

    case "ToolResult": {
      const preview =
        event.output.length > 120 ? `${event.output.slice(0, 120)}…` : event.output;
      console.log(color.toolResult(`  → ${preview.replace(/\n/g, " ")}`));
      break;
    }

    case "TurnEnd":
      if (state.aiOpen) process.stdout.write("\n");
      state.aiOpen = false;
      state.thinkingOpen = false;
      break;
  }
}
