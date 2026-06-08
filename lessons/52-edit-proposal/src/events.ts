export type AgentEvent =
  | { type: "TurnStart"; userInput: string }
  | { type: "ThinkingStart" }
  | { type: "ThinkingUpdated"; text: string }
  | { type: "ThinkingEnd" }
  | { type: "ChunkUpdated"; text: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolCallPending"; name: string; arguments: string }
  | { type: "ToolCallAutoApproved"; name: string; arguments: string }
  | { type: "AskUserPending"; name: string; question: string }
  | { type: "ToolCallDenied"; name: string }
  | {
      type: "ToolResult";
      name: string;
      output: string;
      truncated?: boolean;
      originalLength?: number;
    }
  | {
      type: "PlanUpdated";
      name: string;
      method: "read" | "new" | "replace" | "update" | "delete";
      todos: { text: string; done: boolean }[];
      done: number;
      total: number;
      deleted?: boolean;
    }
  | { type: "TurnEnd"; text: string };
