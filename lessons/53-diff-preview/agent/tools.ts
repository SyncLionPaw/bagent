import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
import { readFileTruncateAfter, sliceAndNumberCapped } from "./readFile.js";
import { formatEditProposal } from "./editProposal.js";
import { runDeleteFile } from "./deleteFile.js";
import { checkCommandString, runCommand } from "./runCommand.js";
import { runStrReplace } from "./strReplace.js";
import {
  PLAN_MAX_CHARS,
  PLAN_NAME_MAX_CHARS,
  PLAN_RESULT_MAX_CHARS,
  planOperate,
  sanitizePlanName,
  type PlanMethod,
} from "./plan.js";
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
export const STR_REPLACE_RESULT_MAX_CHARS = 512;
export const DELETE_FILE_RESULT_MAX_CHARS = 512;
export const RUN_COMMAND_RESULT_MAX_CHARS = 16_000;
export const ASK_USER_QUESTION_MAX_CHARS = 4_000;

const BLOCKED_WRITE_SEGMENTS = new Set([".git", "node_modules"]);

function toolDesc(base: string, maxChars: number): string {
  return `${base} 返回文本上限 ${maxChars} 字符；超出时保留首尾，中间替换为截断说明。`;
}

function readFileBefore(): ToolHookBefore {
  return (ctx) => {
    const args = JSON.parse(ctx.call.function.arguments || "{}") as Record<string, unknown>;
    const path = args.path;
    if (typeof path !== "string" || !path.trim()) {
      throw new ToolAborted(toolError("path 必须是绝对路径字符串"));
    }
    if (args.offset != null) {
      const offset = Number(args.offset);
      if (!Number.isFinite(offset) || offset < 1 || !Number.isInteger(offset)) {
        throw new ToolAborted(toolError("offset 须为 ≥1 的整数（1-based 起始行）"));
      }
    }
    if (args.limit != null) {
      const limit = Number(args.limit);
      if (!Number.isFinite(limit) || limit < 1 || !Number.isInteger(limit)) {
        throw new ToolAborted(toolError("limit 须为 ≥1 的整数（最多读取行数）"));
      }
    }
  };
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

const PLAN_METHODS = new Set<PlanMethod>(["read", "new", "replace", "update", "delete"]);

function planOperateBefore(): ToolHookBefore {
  return (ctx) => {
    const args = JSON.parse(ctx.call.function.arguments || "{}") as Record<string, unknown>;
    const method = args.method;
    if (typeof method !== "string" || !PLAN_METHODS.has(method as PlanMethod)) {
      throw new ToolAborted(
        toolError('method 必须是 "read"、"new"、"replace"、"update" 或 "delete"'),
      );
    }
    const name = args.name;
    if (typeof name !== "string" || !sanitizePlanName(name)) {
      throw new ToolAborted(
        toolError(
          `name 须为非空计划标识（≤${PLAN_NAME_MAX_CHARS} 字符，字母数字 _ . -）`,
        ),
      );
    }
    const content = args.content;
    if (typeof content !== "string") {
      throw new ToolAborted(toolError("content 必须是字符串"));
    }
    if (content.length > PLAN_MAX_CHARS) {
      throw new ToolAborted(toolError(`content 超过上限 ${PLAN_MAX_CHARS} 字符`));
    }
  };
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

function strReplaceBefore(): ToolHookBefore {
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
    const oldString = args.old_string;
    if (typeof oldString !== "string" || !oldString) {
      throw new ToolAborted(toolError("old_string 必须是非空字符串"));
    }
    const newString = args.new_string;
    if (typeof newString !== "string") {
      throw new ToolAborted(toolError("new_string 必须是字符串"));
    }
    if (args.replace_all != null && typeof args.replace_all !== "boolean") {
      throw new ToolAborted(toolError("replace_all 须为布尔值"));
    }
  };
}

function deleteFileBefore(): ToolHookBefore {
  return (ctx) => {
    const args = JSON.parse(ctx.call.function.arguments || "{}") as Record<string, unknown>;
    const path = args.path;
    if (typeof path !== "string" || !path.trim()) {
      throw new ToolAborted(toolError("path 必须是绝对路径字符串"));
    }
    if (!isWritePathAllowed(path)) {
      throw new ToolAborted(
        toolError(
          `禁止删除：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env 文件`,
        ),
      );
    }
  };
}

function runCommandBefore(): ToolHookBefore {
  return (ctx) => {
    const args = JSON.parse(ctx.call.function.arguments || "{}") as Record<string, unknown>;
    const command = args.command;
    if (typeof command !== "string" || !command.trim()) {
      throw new ToolAborted(toolError("command 必须是非空字符串"));
    }
    if (command.length > 2_000) {
      throw new ToolAborted(toolError("command 超过 2000 字符上限"));
    }
    const check = checkCommandString(command);
    if (!check.ok) {
      throw new ToolAborted(toolError(check.reason));
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
    before: [readFileBefore()],
    after: [readFileTruncateAfter(READ_FILE_MAX_CHARS)],
  },
  grep: {
    maxOutputChars: GREP_MAX_CHARS,
    before: [grepPathBefore()],
    after: [truncateAfter(GREP_MAX_CHARS)],
  },
  write_file: {
    maxOutputChars: WRITE_FILE_RESULT_MAX_CHARS,
    before: [writePathBefore()],
    after: [],
  },
  str_replace: {
    maxOutputChars: STR_REPLACE_RESULT_MAX_CHARS,
    before: [strReplaceBefore()],
    after: [],
  },
  delete_file: {
    maxOutputChars: DELETE_FILE_RESULT_MAX_CHARS,
    before: [deleteFileBefore()],
    after: [],
  },
  run_command: {
    maxOutputChars: RUN_COMMAND_RESULT_MAX_CHARS,
    before: [runCommandBefore()],
    after: [truncateAfter(RUN_COMMAND_RESULT_MAX_CHARS)],
  },
  web_search: {
    maxOutputChars: WEB_SEARCH_MAX_CHARS,
    before: [],
    after: [truncateAfter(WEB_SEARCH_MAX_CHARS)],
  },
  plan_operate: {
    maxOutputChars: PLAN_RESULT_MAX_CHARS,
    before: [planOperateBefore()],
    after: [truncateAfter(PLAN_RESULT_MAX_CHARS)],
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
        "读取文件；纯文本每行前带 1-based 行号（格式 `  12|代码`），可选 offset/limit 按行切片。PDF/Excel 等走解析；图片/Office/压缩包返回 hint。",
        READ_FILE_MAX_CHARS,
      ),
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `文件的绝对路径，例如 ${exampleFile}`,
          },
          offset: {
            type: "number",
            description: "可选，从第几行开始读（1-based，默认 1）",
          },
          limit: {
            type: "number",
            description: "可选，最多读取多少行（与 offset 合用可只读片段）",
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
      name: "plan_operate",
      description:
        "管理任务计划（Markdown 待办，临时文件），路径 ~/.bagent/{项目名}/{name}.md，自动放行。改计划前先 read。new/replace/update 维护条目；全部勾选完成或 delete（content 空）= 计划结束，文件会立刻删除不保留。delete 带 content 可删单项。",
      parameters: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["read", "new", "replace", "update", "delete"],
            description:
              "read：读取；new/replace：整表；update：合并/勾选；delete 空 content：标记结束并删文件",
          },
          name: {
            type: "string",
            description:
              "计划标识，对应文件名（不含 .md），如 add-login、release-v2；同一 cwd 下可并存多份",
          },
          content: {
            type: "string",
            description:
              "read 可空。update：- [x] 勾选；全部完成会自动删文件。delete：空串=计划结束删文件；否则删指定条目",
          },
        },
        required: ["method", "name", "content"],
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
  {
    type: "function" as const,
    function: {
      name: "str_replace",
      description:
        "危险：在已有文本文件中做局部修改（exact match 搜索替换），优先于 write_file。" +
        "适用：改函数名/变量名、修 typo、改一两行逻辑、删一段注释或代码——只需动文件中一小段连续原文时。" +
        "不适用：新建文件、整文件重写、大范围重构——用 write_file 提交完整 content。" +
        "流程：先 read_file 复制要改的片段到 old_string（不要含行号前缀 `  12|`，只要 `|` 右侧正文；空格/缩进/换行须与磁盘文件完全一致）。" +
        "new_string 为替换结果，空字符串表示删除匹配内容。" +
        "默认只替换唯一一处；old_string 出现多次且未设 replace_all=true 会报错。" +
        "须在 cwd 下绝对路径；禁止 .git、node_modules、.env。仅 UTF-8 文本。写入前用户会审批。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `目标文件绝对路径，例如 ${resolve(cwd, "notes.txt")}`,
          },
          old_string: {
            type: "string",
            description: "要查找的原文（须与文件内容完全一致，含空格与换行）",
          },
          new_string: {
            type: "string",
            description: "替换后的文本（可为空字符串表示删除）",
          },
          replace_all: {
            type: "boolean",
            description: "可选，默认 false；为 true 时替换所有匹配",
          },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_file",
      description:
        "危险：永久删除 cwd 下的单个文件（不可恢复）。" +
        "适用：用户明确要求删文件、清理临时/废弃脚本、移除不再需要的配置或测试产物。" +
        "不适用：删目录（仅删文件，目录请让用户手动处理）、清空文件内容（用 str_replace 或 write_file）、批量删多文件（逐个调用并分别审批）。" +
        "删除前可用 stat_file 或 read_file 确认路径与内容；误删无法撤销。" +
        "须在 cwd 下绝对路径；禁止 .git、node_modules、.env。写入前用户会审批。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `要删除的文件绝对路径，例如 ${resolve(cwd, "notes.txt")}`,
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_command",
      description:
        "危险：在 cwd 下执行白名单内的观测命令（不启 shell），捕获 stdout/stderr。" +
        "仅允许 curl（GET/HEAD 探 http(s) URL，禁 -o 写盘）、ps（看进程）、lsof（看端口/占用，如 lsof -i :3000）。" +
        "npm/git/node/python 等编译运行类不在本课白名单，留给后续沙箱课。" +
        "不要用本工具代替专用工具：读用 ls/pwd/grep/read_file；写改用 write_file/str_replace；勿用 vim/nano/sed。" +
        "禁止 | ; & 重定向。执行前用户会审批。",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description:
              "完整命令一行，如 curl -sI https://example.com、lsof -i :8080、ps aux",
          },
        },
        required: ["command"],
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

async function runReadFile(
  path: string,
  offset?: number,
  limit?: number,
): Promise<string> {
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
    const raw = buf.toString("utf-8");
    const allLines = raw.split(/\r?\n/);
    const totalLines =
      allLines.length === 1 && allLines[0] === "" ? 0 : allLines.length;
    const startLine = Math.max(1, Math.floor(offset ?? 1));
    if (totalLines === 0) return "(空文件)";
    if (startLine > totalLines) {
      return toolError(`offset ${startLine} 超出文件行数 ${totalLines}`);
    }
    const text = sliceAndNumberCapped(raw, offset ?? 1, limit, READ_FILE_MAX_CHARS);
    if (!text) return "(无内容)";
    return text;
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
    let oldContent = "";
    if (existsSync(abs)) {
      const st = statSync(abs);
      if (!st.isFile()) {
        return toolError(`不是文件: ${abs}`);
      }
      oldContent = readFileSync(abs, "utf-8");
    }
    return formatEditProposal(abs, oldContent, content);
  } catch (err) {
    return toolError(String(err));
  }
}

export async function runTool(call: ToolCall): Promise<string> {
  const args = JSON.parse(call.function.arguments || "{}") as Record<
    string,
    string | number | boolean | undefined
  >;

  switch (call.function.name) {
    case "pwd":
      return runPwd();
    case "ls":
      return runLs(String(args.path ?? ""));
    case "stat_file":
      return runStatFile(String(args.path ?? ""));
    case "read_file":
      return runReadFile(
        String(args.path ?? ""),
        args.offset != null ? Number(args.offset) : undefined,
        args.limit != null ? Number(args.limit) : undefined,
      );
    case "grep":
      return runGrep(
        String(args.pattern ?? ""),
        String(args.path ?? ""),
        args.glob != null ? String(args.glob) : undefined,
        args.max_results != null ? Number(args.max_results) : GREP_DEFAULT_MAX_RESULTS,
      );
    case "write_file":
      return runWriteFile(String(args.path ?? ""), String(args.content ?? ""));
    case "str_replace": {
      const abs = pathUnderCwd(String(args.path ?? ""));
      if (!abs || !isWritePathAllowed(String(args.path ?? ""))) {
        return toolError(
          `禁止写入：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env`,
        );
      }
      return runStrReplace(
        abs,
        String(args.old_string ?? ""),
        String(args.new_string ?? ""),
        args.replace_all === true,
      );
    }
    case "delete_file": {
      const abs = pathUnderCwd(String(args.path ?? ""));
      if (!abs || !isWritePathAllowed(String(args.path ?? ""))) {
        return toolError(
          `禁止删除：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env`,
        );
      }
      return runDeleteFile(abs);
    }
    case "run_command":
      return runCommand(String(args.command ?? ""));
    case "plan_operate":
      return planOperate(
        String(args.method ?? "") as PlanMethod,
        String(args.name ?? ""),
        String(args.content ?? ""),
      );
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
