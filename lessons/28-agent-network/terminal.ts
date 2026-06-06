import { color } from "./color.js";
import type { AgentEvent } from "./events.js";

export function handleTerminalEvent(event: AgentEvent, state: { aiOpen: boolean }): void {
  switch (event.type) {
    case "TurnStart":
      state.aiOpen = false;
      break;
    case "ChunkUpdated":
      if (!state.aiOpen) {
        process.stdout.write(color.ai("AI: "));
        state.aiOpen = true;
      }
      process.stdout.write(color.ai(event.text));
      break;
    case "ToolCallStart":
      if (state.aiOpen) process.stdout.write("\n");
      state.aiOpen = false;
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
      break;
  }
}
