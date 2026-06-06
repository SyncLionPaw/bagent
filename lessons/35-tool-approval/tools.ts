import { readFileSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { ToolCall } from "./messages.js";

const cwd = process.cwd();
const exampleFile = resolve(cwd, "package.json");
const exampleDir = cwd;

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "pwd",
      description: "返回当前工作目录的绝对路径",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ls",
      description: "列出目录下的文件和子目录",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `目录的绝对路径，例如 ${exampleDir}`,
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取文本文件内容",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `文件的绝对路径，例如 ${exampleFile}`,
          },
        },
        required: ["path"],
      },
    },
  },
];

function absolutePath(path: string): string | null {
  return isAbsolute(path) ? path : null;
}

function toolError(message: string): string {
  return JSON.stringify({ error: message });
}

function runPwd(): string {
  return cwd;
}

function runLs(path: string): string {
  const abs = absolutePath(path);
  if (!abs) {
    return toolError(`path 必须是绝对路径，可先调用 pwd 或 ls ${exampleDir}`);
  }
  try {
    const st = statSync(abs);
    if (!st.isDirectory()) {
      return toolError(`不是目录: ${abs}`);
    }
    const names = readdirSync(abs).sort();
    return names.join("\n") || "(空目录)";
  } catch (err) {
    return toolError(String(err));
  }
}

function runReadFile(path: string): string {
  const abs = absolutePath(path);
  if (!abs) {
    return toolError(`path 必须是绝对路径，例如 ${exampleFile}`);
  }
  try {
    const st = statSync(abs);
    if (!st.isFile()) {
      return toolError(`不是文件: ${abs}`);
    }
    return readFileSync(abs, "utf-8");
  } catch (err) {
    return toolError(String(err));
  }
}

export function runTool(call: ToolCall): string {
  const args = JSON.parse(call.function.arguments || "{}") as Record<string, string>;

  switch (call.function.name) {
    case "pwd":
      return runPwd();
    case "ls":
      return runLs(args.path);
    case "read_file":
      return runReadFile(args.path);
    default:
      return toolError(`未知工具: ${call.function.name}`);
  }
}
