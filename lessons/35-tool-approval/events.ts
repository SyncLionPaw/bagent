/** Agent 内核 → UI 的领域事件（第 35 课：在 34 基础上加工具审批） */

export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ThinkingStart" }
  | { type: "ThinkingUpdated"; text: string }
  | { type: "ThinkingEnd" }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolCallPending"; name: string; arguments: string }
  | { type: "ToolCallDenied"; name: string }
  | { type: "ToolResult"; name: string; output: string }
  | { type: "TurnEnd"; text: string };
