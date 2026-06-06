export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolResult"; name: string; output: string }
  | { type: "TurnEnd"; text: string };
