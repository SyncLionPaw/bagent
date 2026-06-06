import { fileURLToPath } from "node:url";

/**
 * Agent Loop 的 messages[]（对齐 DeepSeek / OpenAI Chat Completions）
 *
 * 分层：
 *   ToolFunctionCall → ToolCall → AssistantMessage.tool_calls
 *   SystemMessage | UserMessage | AssistantMessage | ToolMessage → Message
 *   Message[] → ChatHistory
 */

/** 模型要调用的函数名 + 参数（arguments 是 JSON 字符串） */
export interface ToolFunctionCall {
  name: string;
  arguments: string;
}

/** assistant 消息里的一条工具调用请求 */
export interface ToolCall {
  id: string;
  type: "function";
  function: ToolFunctionCall;
}

// —— 四种 role，各一张「表」——

export interface SystemMessage {
  role: "system";
  content: string;
}

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  /** null：本轮只下发 tool_calls，还没有对用户可见的正文 */
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface ToolMessage {
  role: "tool";
  /** 必须等于上一条 assistant.tool_calls 里某条的 id */
  tool_call_id: string;
  content: string;
}

/** 历史里任意一条 */
export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage;

/** 整个会话在内存里的形态 */
export type ChatHistory = Message[];

/** 一轮工具调用轨迹（doc 与 npm run ch23 共用） */
export const exampleTurn: ChatHistory = [
  { role: "system", content: "你是代码助手。" },
  { role: "user", content: "读 package.json 的 name" },
  {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        id: "call_1",
        type: "function",
        function: {
          name: "read_file",
          arguments: '{"path":"package.json"}',
        },
      },
    ],
  },
  {
    role: "tool",
    tool_call_id: "call_1",
    content: '{"name":"bagent"}',
  },
  { role: "assistant", content: "项目名是 bagent。" },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(exampleTurn, null, 2));
}
