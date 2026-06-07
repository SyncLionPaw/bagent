export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ThinkingStart" }
  | { type: "ThinkingUpdated"; text: string }
  | { type: "ThinkingEnd" }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolCallPending"; name: string; arguments: string }
  | { type: "ToolCallDenied"; name: string }
  | {
      type: "ToolResult";
      name: string;
      output: string;
      truncated?: boolean;
      originalLength?: number;
    }
  | { type: "TurnEnd"; text: string };
