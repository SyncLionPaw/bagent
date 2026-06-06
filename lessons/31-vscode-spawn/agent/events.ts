/** 子进程 stdout：一行一个 JSON（与第 28 课 SSE data 载荷相同） */

export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolResult"; name: string; output: string }
  | { type: "TurnEnd"; text: string };
