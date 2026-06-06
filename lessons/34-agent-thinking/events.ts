/** Agent 内核 → UI 的领域事件（第 34 课：在 26 基础上加思考） */

export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ThinkingStart" }
  | { type: "ThinkingUpdated"; text: string }
  | { type: "ThinkingEnd" }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolResult"; name: string; output: string }
  | { type: "TurnEnd"; text: string };
