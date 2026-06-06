import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolCall } from "./messages.js";

/** 发给 API 的 tools 定义 */
export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取项目根目录下的文本文件",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "如 package.json" },
        },
        required: ["path"],
      },
    },
  },
];

const allowed = new Set(["package.json", "README.md"]);

export function runTool(call: ToolCall): string {
  const { path } = JSON.parse(call.function.arguments) as { path: string };
  if (!allowed.has(path)) {
    return JSON.stringify({ error: `本课只允许读: ${[...allowed].join(", ")}` });
  }
  try {
    return readFileSync(resolve(process.cwd(), path), "utf-8");
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}
