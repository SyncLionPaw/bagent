import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import {
  bufferLooksBinary,
  classifyByPath,
  extensionOf,
  kindHint,
  readableByReadFile,
  type FileKind,
} from "./fileKind.js";
import { ToolAborted, truncateAfter, type ToolHookBefore, type ToolHooks } from "./hooks.js";
import type { ToolCall } from "./messages.js";
import { readPdf, readSpreadsheet, unsupportedReadResult } from "./readDispatch.js";
import { hasWebSearch, tavilySearch, WEB_SEARCH_MAX_CHARS } from "./tavily.js";

const cwd = process.cwd();
const exampleFile = resolve(cwd, "package.json");
const exampleDir = cwd;

const SKIP_DIRS = new Set([".git", "node_modules"]);

export const PWD_MAX_CHARS = 512;
export const LS_MAX_CHARS = 4_000;
export const STAT_FILE_MAX_CHARS = 512;
export const READ_FILE_MAX_CHARS = 8_000;
export const GREP_MAX_CHARS = 8_000;
export const GREP_DEFAULT_MAX_RESULTS = 50;
export const GREP_MAX_RESULTS_CAP = 200;
export const WRITE_FILE_MAX_CHARS = 100_000;
export const WRITE_FILE_RESULT_MAX_CHARS = 512;
export const ASK_USER_QUESTION_MAX_CHARS = 4_000;

const BLOCKED_WRITE_SEGMENTS = new Set([".git", "node_modules"]);

function toolDesc(base: string, maxChars: number): string {
  return `${base} 返回文本上限 ${maxChars} 字符；超出时保留首尾，中间替换为截断说明。`;
}

function grepPathBefore(): ToolHookBefore {
  return (ctx) => {
    const args = JSON.parse(ctx.call.function.arguments || "{}") as Record<string, unknown>;
    const path = args.path;
    if (typeof path !== "string" || !pathUnderCwd(path)) {
      throw new ToolAborted(
        toolError(`path 必须在 cwd (${cwd}) 下且为绝对路径，可先调用 pwd`),
      );
    }
  };
}

function isWritePathAllowed(path: string): boolean {
  const abs = pathUnderCwd(path);
  if (!abs) return false;
  const parts = abs.split(sep);
  if (parts.some((p) => BLOCKED_WRITE_SEGMENTS.has(p))) return false;
  const base = basename(abs);
  if (base === ".env" || base.startsWith(".env.")) return false;
  return true;
}

function writePathBefore(): ToolHookBefore {
  return (ctx) => {
    const args = JSON.parse(ctx.call.function.arguments || "{}") as Record<string, unknown>;
    const path = args.path;
    if (typeof path !== "string" || !isWritePathAllowed(path)) {
      throw new ToolAborted(
        toolError(
          `禁止写入：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env 文件`,
        ),
      );
    }
    const content = args.content;
    if (typeof content !== "string") {
      throw new ToolAborted(toolError("content 必须是字符串"));
    }
    if (content.length > WRITE_FILE_MAX_CHARS) {
      throw new ToolAborted(
        toolError(`content 超过上限 ${WRITE_FILE_MAX_CHARS} 字符`),
      );
    }
  };
}

export const toolHooks: Record<string, ToolHooks> = {
  pwd: {
    maxOutputChars: PWD_MAX_CHARS,
    before: [],
    after: [truncateAfter(PWD_MAX_CHARS)],
  },
  ls: {
    maxOutputChars: LS_MAX_CHARS,
    before: [],
    after: [truncateAfter(LS_MAX_CHARS)],
  },
  stat_file: {
    maxOutputChars: STAT_FILE_MAX_CHARS,
    before: [],
    after: [truncateAfter(STAT_FILE_MAX_CHARS)],
  },
  read_file: {
    maxOutputChars: READ_FILE_MAX_CHARS,
    before: [],
    after: [truncateAfter(READ_FILE_MAX_CHARS)],
  },
  grep: {
    maxOutputChars: GREP_MAX_CHARS,
    before: [grepPathBefore()],
    after: [truncateAfter(GREP_MAX_CHARS)],
  },
  write_file: {
    maxOutputChars: WRITE_FILE_RESULT_MAX_CHARS,
    before: [writePathBefore()],
    after: [truncateAfter(WRITE_FILE_RESULT_MAX_CHARS)],
  },
  web_search: {
    maxOutputChars: WEB_SEARCH_MAX_CHARS,
    before: [],
    after: [truncateAfter(WEB_SEARCH_MAX_CHARS)],
  },
};

const webSearchDefinition = {
  type: "function" as const,
  function: {
    name: "web_search",
    description: toolDesc(
      "联网搜索（Tavily）。用户要搜一下、查新闻、查实时公开资料时使用。",
      WEB_SEARCH_MAX_CHARS,
    ),
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
      },
      required: ["query"],
    },
  },
};

const askUserQuestionDefinition = {
  type: "function" as const,
  function: {
    name: "ask_user_question",
    description:
      "向用户追问一条必要信息（必选场景：用户意图含糊、需指定文件名/路径/选项才能继续）。禁止用最终文字回复代替本工具。用户可跳过，hint 后自行决定。不要问已从 ls/read 能确定的事实。",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "要问用户的一句清楚、具体的问题",
        },
      },
      required: ["question"],
    },
  },
};

const baseToolDefinitions = [
  askUserQuestionDefinition,
  {
    type: "function" as const,
    function: {
      name: "pwd",
      description: toolDesc("返回当前工作目录的绝对路径。", PWD_MAX_CHARS),
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ls",
      description: toolDesc("列出目录下的文件和子目录。", LS_MAX_CHARS),
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
      name: "stat_file",
      description: toolDesc(
        "查看文件或目录元信息：大小、mtime、扩展名、类型（text/image/pdf/spreadsheet 等）、是否适合 read_file。读未知文件前建议先调用。",
        STAT_FILE_MAX_CHARS,
      ),
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `文件或目录的绝对路径，例如 ${exampleFile}`,
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
      description: toolDesc(
        "读取文件并按类型分发：纯文本直接读；PDF 用 pdf-parse；Excel 用 xlsx 导出 CSV；图片/Office/压缩包等返回 hint。扫描版 PDF 可能提示 OCR（开发中）。",
        READ_FILE_MAX_CHARS,
      ),
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
  {
    type: "function" as const,
    function: {
      name: "grep",
      description: toolDesc(
        "在文件或目录下搜索文本（JavaScript 正则，默认区分大小写）。每行一条匹配，格式为 file:line: content。默认跳过 .git、node_modules。",
        GREP_MAX_CHARS,
      ),
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "正则表达式，例如 runTool|grep",
          },
          path: {
            type: "string",
            description: `搜索根路径（文件或目录），须在 cwd 下，例如 ${exampleDir}`,
          },
          glob: {
            type: "string",
            description: "可选，仅匹配文件名，如 *.ts、*.md",
          },
          max_results: {
            type: "number",
            description: `可选，最多返回几条匹配，默认 ${GREP_DEFAULT_MAX_RESULTS}，上限 ${GREP_MAX_RESULTS_CAP}`,
          },
        },
        required: ["pattern", "path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "危险：用 content 覆盖写入文本文件（整文件替换）。须在 cwd 下绝对路径；禁止 .git、node_modules、.env。写入前用户会审批。content 上限 " +
        WRITE_FILE_MAX_CHARS +
        " 字符。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `目标文件绝对路径，例如 ${resolve(cwd, "notes.txt")}`,
          },
          content: {
            type: "string",
            description: "写入后的完整文件内容",
          },
        },
        required: ["path", "content"],
      },
    },
  },
];

export function getToolDefinitions() {
  if (!hasWebSearch()) return baseToolDefinitions;
  return [...baseToolDefinitions, webSearchDefinition];
}

function absolutePath(path: string): string | null {
  return isAbsolute(path) ? path : null;
}

function pathUnderCwd(path: string): string | null {
  const abs = absolutePath(path);
  if (!abs) return null;
  const normalized = resolve(abs);
  const root = resolve(cwd);
  if (normalized === root || normalized.startsWith(root + sep)) {
    return normalized;
  }
  return null;
}

function toolError(message: string): string {
  return JSON.stringify({ error: message });
}

function globMatch(name: string, glob: string): boolean {
  const re = new RegExp(
    `^${glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`,
  );
  return re.test(name);
}

function collectFiles(root: string, glob?: string): string[] {
  const st = statSync(root);
  if (st.isFile()) {
    if (glob && !globMatch(basename(root), glob)) return [];
    return [root];
  }
  if (!st.isDirectory()) return [];

  const files: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        stack.push(full);
      } else if (ent.isFile()) {
        if (!glob || globMatch(ent.name, glob)) {
          files.push(full);
        }
      }
    }
  }

  return files.sort();
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

function fileKindForPath(abs: string, isFile: boolean): FileKind | "directory" | null {
  if (!isFile) return "directory";
  return classifyByPath(abs);
}

function runStatFile(path: string): string {
  const abs = absolutePath(path);
  if (!abs) {
    return toolError(`path 必须是绝对路径，例如 ${exampleFile}`);
  }
  try {
    const st = statSync(abs);
    const isFile = st.isFile();
    const isDirectory = st.isDirectory();
    const fileKind = isFile ? classifyByPath(abs) : null;
    const kind = isDirectory ? "directory" : fileKind;
    const ext = extensionOf(abs);
    const asText = isFile && (fileKind === "text" || fileKind === null);
    const viaReadFile = isFile && readableByReadFile(fileKind);
    let hint: string | undefined;
    if (isDirectory) {
      hint = "目录，用 ls 列出内容";
    } else if (kind === "directory") {
      hint = "目录，用 ls 列出内容";
    } else if (fileKind) {
      hint = kindHint(fileKind);
    } else {
      hint = "未知扩展名，read_file 会嗅探是否二进制";
    }
    return JSON.stringify({
      path: abs,
      is_file: isFile,
      is_directory: isDirectory,
      size: st.size,
      mtime_ms: st.mtimeMs,
      extension: ext || null,
      kind: kind ?? "unknown",
      readable_as_text: asText,
      readable_via_read_file: viaReadFile,
      hint,
    });
  } catch (err) {
    return toolError(String(err));
  }
}

async function runReadFile(path: string): Promise<string> {
  const abs = absolutePath(path);
  if (!abs) {
    return toolError(`path 必须是绝对路径，例如 ${exampleFile}`);
  }
  try {
    const st = statSync(abs);
    if (!st.isFile()) {
      return toolError(`不是文件: ${abs}`);
    }
    const kind = classifyByPath(abs);
    if (kind === "pdf") return readPdf(abs);
    if (kind === "spreadsheet") return readSpreadsheet(abs);
    if (
      kind === "image" ||
      kind === "office" ||
      kind === "archive"
    ) {
      return unsupportedReadResult(kind);
    }
    const buf = readFileSync(abs);
    if ((kind === null || kind === "text") && bufferLooksBinary(buf)) {
      return JSON.stringify({
        ok: false,
        kind: "binary",
        error: kindHint("binary"),
        hint: kindHint("binary"),
      });
    }
    return buf.toString("utf-8");
  } catch (err) {
    return toolError(String(err));
  }
}

function shouldGrepFile(path: string): boolean {
  const kind = classifyByPath(path);
  return kind === null || kind === "text";
}

function runGrep(
  pattern: string,
  path: string,
  glob?: string,
  maxResults = GREP_DEFAULT_MAX_RESULTS,
): string {
  const abs = pathUnderCwd(path);
  if (!abs) {
    return toolError(`path 必须在 cwd (${cwd}) 下且为绝对路径，可先调用 pwd`);
  }
  if (!pattern) {
    return toolError("pattern 不能为空");
  }

  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch (err) {
    return toolError(`无效正则: ${err}`);
  }

  const limit = Math.min(
    Math.max(1, Number.isFinite(maxResults) ? maxResults : GREP_DEFAULT_MAX_RESULTS),
    GREP_MAX_RESULTS_CAP,
  );

  try {
    statSync(abs);
  } catch (err) {
    return toolError(String(err));
  }

  const matches: string[] = [];
  let hitLimit = false;

  for (const file of collectFiles(abs, glob)) {
    if (matches.length >= limit) {
      hitLimit = true;
      break;
    }

    if (!shouldGrepFile(file)) continue;

    let content: string;
    try {
      const st = statSync(file);
      if (!st.isFile()) continue;
      const buf = readFileSync(file);
      if (bufferLooksBinary(buf)) continue;
      content = buf.toString("utf-8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= limit) {
        hitLimit = true;
        break;
      }
      if (re.test(lines[i])) {
        matches.push(`${file}:${i + 1}: ${lines[i]}`);
      }
    }
  }

  if (!matches.length) return "(无匹配)";

  let out = matches.join("\n");
  if (hitLimit) {
    out += `\n\n[已截断：仅显示前 ${limit} 条匹配]`;
  }
  return out;
}

function runWriteFile(path: string, content: string): string {
  const abs = pathUnderCwd(path);
  if (!abs || !isWritePathAllowed(path)) {
    return toolError(
      `禁止写入：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env`,
    );
  }
  if (content.length > WRITE_FILE_MAX_CHARS) {
    return toolError(`content 超过上限 ${WRITE_FILE_MAX_CHARS} 字符`);
  }
  try {
    writeFileSync(abs, content, "utf-8");
    return JSON.stringify({
      ok: true,
      path: abs,
      bytes: Buffer.byteLength(content, "utf-8"),
    });
  } catch (err) {
    return toolError(String(err));
  }
}

export async function runTool(call: ToolCall): Promise<string> {
  const args = JSON.parse(call.function.arguments || "{}") as Record<
    string,
    string | number | undefined
  >;

  switch (call.function.name) {
    case "pwd":
      return runPwd();
    case "ls":
      return runLs(String(args.path ?? ""));
    case "stat_file":
      return runStatFile(String(args.path ?? ""));
    case "read_file":
      return runReadFile(String(args.path ?? ""));
    case "grep":
      return runGrep(
        String(args.pattern ?? ""),
        String(args.path ?? ""),
        args.glob != null ? String(args.glob) : undefined,
        args.max_results != null ? Number(args.max_results) : GREP_DEFAULT_MAX_RESULTS,
      );
    case "write_file":
      return runWriteFile(String(args.path ?? ""), String(args.content ?? ""));
    case "web_search": {
      const query = String(args.query ?? "").trim();
      if (!query) return toolError("query 不能为空");
      try {
        return await tavilySearch(query);
      } catch (err) {
        const e = err as Error & { cause?: { code?: string } };
        return `搜索失败：${e.cause?.code ?? e.message}`;
      }
    }
    default:
      return toolError(`未知工具: ${call.function.name}`);
  }
}

export function hooksFor(call: ToolCall): ToolHooks {
  return (
    toolHooks[call.function.name] ?? {
      maxOutputChars: 4_000,
      before: [],
      after: [truncateAfter(4_000)],
    }
  );
}
