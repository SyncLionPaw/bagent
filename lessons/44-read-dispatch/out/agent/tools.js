"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDefinitions = exports.toolHooks = exports.WRITE_FILE_RESULT_MAX_CHARS = exports.WRITE_FILE_MAX_CHARS = exports.GREP_MAX_RESULTS_CAP = exports.GREP_DEFAULT_MAX_RESULTS = exports.GREP_MAX_CHARS = exports.READ_FILE_MAX_CHARS = exports.STAT_FILE_MAX_CHARS = exports.LS_MAX_CHARS = exports.PWD_MAX_CHARS = void 0;
exports.runTool = runTool;
exports.hooksFor = hooksFor;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fileKind_js_1 = require("./fileKind.js");
const hooks_js_1 = require("./hooks.js");
const readDispatch_js_1 = require("./readDispatch.js");
const cwd = process.cwd();
const exampleFile = (0, node_path_1.resolve)(cwd, "package.json");
const exampleDir = cwd;
const SKIP_DIRS = new Set([".git", "node_modules"]);
exports.PWD_MAX_CHARS = 512;
exports.LS_MAX_CHARS = 4_000;
exports.STAT_FILE_MAX_CHARS = 512;
exports.READ_FILE_MAX_CHARS = 8_000;
exports.GREP_MAX_CHARS = 8_000;
exports.GREP_DEFAULT_MAX_RESULTS = 50;
exports.GREP_MAX_RESULTS_CAP = 200;
exports.WRITE_FILE_MAX_CHARS = 100_000;
exports.WRITE_FILE_RESULT_MAX_CHARS = 512;
const BLOCKED_WRITE_SEGMENTS = new Set([".git", "node_modules"]);
function toolDesc(base, maxChars) {
    return `${base} 返回文本上限 ${maxChars} 字符；超出时保留首尾，中间替换为截断说明。`;
}
function grepPathBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const path = args.path;
        if (typeof path !== "string" || !pathUnderCwd(path)) {
            throw new hooks_js_1.ToolAborted(toolError(`path 必须在 cwd (${cwd}) 下且为绝对路径，可先调用 pwd`));
        }
    };
}
function isWritePathAllowed(path) {
    const abs = pathUnderCwd(path);
    if (!abs)
        return false;
    const parts = abs.split(node_path_1.sep);
    if (parts.some((p) => BLOCKED_WRITE_SEGMENTS.has(p)))
        return false;
    const base = (0, node_path_1.basename)(abs);
    if (base === ".env" || base.startsWith(".env."))
        return false;
    return true;
}
function writePathBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const path = args.path;
        if (typeof path !== "string" || !isWritePathAllowed(path)) {
            throw new hooks_js_1.ToolAborted(toolError(`禁止写入：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env 文件`));
        }
        const content = args.content;
        if (typeof content !== "string") {
            throw new hooks_js_1.ToolAborted(toolError("content 必须是字符串"));
        }
        if (content.length > exports.WRITE_FILE_MAX_CHARS) {
            throw new hooks_js_1.ToolAborted(toolError(`content 超过上限 ${exports.WRITE_FILE_MAX_CHARS} 字符`));
        }
    };
}
exports.toolHooks = {
    pwd: {
        maxOutputChars: exports.PWD_MAX_CHARS,
        before: [],
        after: [(0, hooks_js_1.truncateAfter)(exports.PWD_MAX_CHARS)],
    },
    ls: {
        maxOutputChars: exports.LS_MAX_CHARS,
        before: [],
        after: [(0, hooks_js_1.truncateAfter)(exports.LS_MAX_CHARS)],
    },
    stat_file: {
        maxOutputChars: exports.STAT_FILE_MAX_CHARS,
        before: [],
        after: [(0, hooks_js_1.truncateAfter)(exports.STAT_FILE_MAX_CHARS)],
    },
    read_file: {
        maxOutputChars: exports.READ_FILE_MAX_CHARS,
        before: [],
        after: [(0, hooks_js_1.truncateAfter)(exports.READ_FILE_MAX_CHARS)],
    },
    grep: {
        maxOutputChars: exports.GREP_MAX_CHARS,
        before: [grepPathBefore()],
        after: [(0, hooks_js_1.truncateAfter)(exports.GREP_MAX_CHARS)],
    },
    write_file: {
        maxOutputChars: exports.WRITE_FILE_RESULT_MAX_CHARS,
        before: [writePathBefore()],
        after: [(0, hooks_js_1.truncateAfter)(exports.WRITE_FILE_RESULT_MAX_CHARS)],
    },
};
exports.toolDefinitions = [
    {
        type: "function",
        function: {
            name: "pwd",
            description: toolDesc("返回当前工作目录的绝对路径。", exports.PWD_MAX_CHARS),
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "ls",
            description: toolDesc("列出目录下的文件和子目录。", exports.LS_MAX_CHARS),
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
        type: "function",
        function: {
            name: "stat_file",
            description: toolDesc("查看文件或目录元信息：大小、mtime、扩展名、类型（text/image/pdf/spreadsheet 等）、是否适合 read_file。读未知文件前建议先调用。", exports.STAT_FILE_MAX_CHARS),
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
        type: "function",
        function: {
            name: "read_file",
            description: toolDesc("读取文件并按类型分发：纯文本直接读；PDF 用 pdf-parse；Excel 用 xlsx 导出 CSV；图片/Office/压缩包等返回 hint。扫描版 PDF 可能提示 OCR（开发中）。", exports.READ_FILE_MAX_CHARS),
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
        type: "function",
        function: {
            name: "grep",
            description: toolDesc("在文件或目录下搜索文本（JavaScript 正则，默认区分大小写）。每行一条匹配，格式为 file:line: content。默认跳过 .git、node_modules。", exports.GREP_MAX_CHARS),
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
                        description: `可选，最多返回几条匹配，默认 ${exports.GREP_DEFAULT_MAX_RESULTS}，上限 ${exports.GREP_MAX_RESULTS_CAP}`,
                    },
                },
                required: ["pattern", "path"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "write_file",
            description: "危险：用 content 覆盖写入文本文件（整文件替换）。须在 cwd 下绝对路径；禁止 .git、node_modules、.env。写入前用户会审批。content 上限 " +
                exports.WRITE_FILE_MAX_CHARS +
                " 字符。",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: `目标文件绝对路径，例如 ${(0, node_path_1.resolve)(cwd, "notes.txt")}`,
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
function absolutePath(path) {
    return (0, node_path_1.isAbsolute)(path) ? path : null;
}
function pathUnderCwd(path) {
    const abs = absolutePath(path);
    if (!abs)
        return null;
    const normalized = (0, node_path_1.resolve)(abs);
    const root = (0, node_path_1.resolve)(cwd);
    if (normalized === root || normalized.startsWith(root + node_path_1.sep)) {
        return normalized;
    }
    return null;
}
function toolError(message) {
    return JSON.stringify({ error: message });
}
function globMatch(name, glob) {
    const re = new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    return re.test(name);
}
function collectFiles(root, glob) {
    const st = (0, node_fs_1.statSync)(root);
    if (st.isFile()) {
        if (glob && !globMatch((0, node_path_1.basename)(root), glob))
            return [];
        return [root];
    }
    if (!st.isDirectory())
        return [];
    const files = [];
    const stack = [root];
    while (stack.length > 0) {
        const dir = stack.pop();
        let entries;
        try {
            entries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const ent of entries) {
            const full = (0, node_path_1.join)(dir, ent.name);
            if (ent.isDirectory()) {
                if (SKIP_DIRS.has(ent.name))
                    continue;
                stack.push(full);
            }
            else if (ent.isFile()) {
                if (!glob || globMatch(ent.name, glob)) {
                    files.push(full);
                }
            }
        }
    }
    return files.sort();
}
function runPwd() {
    return cwd;
}
function runLs(path) {
    const abs = absolutePath(path);
    if (!abs) {
        return toolError(`path 必须是绝对路径，可先调用 pwd 或 ls ${exampleDir}`);
    }
    try {
        const st = (0, node_fs_1.statSync)(abs);
        if (!st.isDirectory()) {
            return toolError(`不是目录: ${abs}`);
        }
        const names = (0, node_fs_1.readdirSync)(abs).sort();
        return names.join("\n") || "(空目录)";
    }
    catch (err) {
        return toolError(String(err));
    }
}
function fileKindForPath(abs, isFile) {
    if (!isFile)
        return "directory";
    return (0, fileKind_js_1.classifyByPath)(abs);
}
function runStatFile(path) {
    const abs = absolutePath(path);
    if (!abs) {
        return toolError(`path 必须是绝对路径，例如 ${exampleFile}`);
    }
    try {
        const st = (0, node_fs_1.statSync)(abs);
        const isFile = st.isFile();
        const isDirectory = st.isDirectory();
        const fileKind = isFile ? (0, fileKind_js_1.classifyByPath)(abs) : null;
        const kind = isDirectory ? "directory" : fileKind;
        const ext = (0, fileKind_js_1.extensionOf)(abs);
        const asText = isFile && (fileKind === "text" || fileKind === null);
        const viaReadFile = isFile && (0, fileKind_js_1.readableByReadFile)(fileKind);
        let hint;
        if (isDirectory) {
            hint = "目录，用 ls 列出内容";
        }
        else if (kind === "directory") {
            hint = "目录，用 ls 列出内容";
        }
        else if (fileKind) {
            hint = (0, fileKind_js_1.kindHint)(fileKind);
        }
        else {
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
    }
    catch (err) {
        return toolError(String(err));
    }
}
async function runReadFile(path) {
    const abs = absolutePath(path);
    if (!abs) {
        return toolError(`path 必须是绝对路径，例如 ${exampleFile}`);
    }
    try {
        const st = (0, node_fs_1.statSync)(abs);
        if (!st.isFile()) {
            return toolError(`不是文件: ${abs}`);
        }
        const kind = (0, fileKind_js_1.classifyByPath)(abs);
        if (kind === "pdf")
            return (0, readDispatch_js_1.readPdf)(abs);
        if (kind === "spreadsheet")
            return (0, readDispatch_js_1.readSpreadsheet)(abs);
        if (kind === "image" ||
            kind === "office" ||
            kind === "archive") {
            return (0, readDispatch_js_1.unsupportedReadResult)(kind);
        }
        const buf = (0, node_fs_1.readFileSync)(abs);
        if ((kind === null || kind === "text") && (0, fileKind_js_1.bufferLooksBinary)(buf)) {
            return JSON.stringify({
                ok: false,
                kind: "binary",
                error: (0, fileKind_js_1.kindHint)("binary"),
                hint: (0, fileKind_js_1.kindHint)("binary"),
            });
        }
        return buf.toString("utf-8");
    }
    catch (err) {
        return toolError(String(err));
    }
}
function shouldGrepFile(path) {
    const kind = (0, fileKind_js_1.classifyByPath)(path);
    return kind === null || kind === "text";
}
function runGrep(pattern, path, glob, maxResults = exports.GREP_DEFAULT_MAX_RESULTS) {
    const abs = pathUnderCwd(path);
    if (!abs) {
        return toolError(`path 必须在 cwd (${cwd}) 下且为绝对路径，可先调用 pwd`);
    }
    if (!pattern) {
        return toolError("pattern 不能为空");
    }
    let re;
    try {
        re = new RegExp(pattern);
    }
    catch (err) {
        return toolError(`无效正则: ${err}`);
    }
    const limit = Math.min(Math.max(1, Number.isFinite(maxResults) ? maxResults : exports.GREP_DEFAULT_MAX_RESULTS), exports.GREP_MAX_RESULTS_CAP);
    try {
        (0, node_fs_1.statSync)(abs);
    }
    catch (err) {
        return toolError(String(err));
    }
    const matches = [];
    let hitLimit = false;
    for (const file of collectFiles(abs, glob)) {
        if (matches.length >= limit) {
            hitLimit = true;
            break;
        }
        if (!shouldGrepFile(file))
            continue;
        let content;
        try {
            const st = (0, node_fs_1.statSync)(file);
            if (!st.isFile())
                continue;
            const buf = (0, node_fs_1.readFileSync)(file);
            if ((0, fileKind_js_1.bufferLooksBinary)(buf))
                continue;
            content = buf.toString("utf-8");
        }
        catch {
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
    if (!matches.length)
        return "(无匹配)";
    let out = matches.join("\n");
    if (hitLimit) {
        out += `\n\n[已截断：仅显示前 ${limit} 条匹配]`;
    }
    return out;
}
function runWriteFile(path, content) {
    const abs = pathUnderCwd(path);
    if (!abs || !isWritePathAllowed(path)) {
        return toolError(`禁止写入：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env`);
    }
    if (content.length > exports.WRITE_FILE_MAX_CHARS) {
        return toolError(`content 超过上限 ${exports.WRITE_FILE_MAX_CHARS} 字符`);
    }
    try {
        (0, node_fs_1.writeFileSync)(abs, content, "utf-8");
        return JSON.stringify({
            ok: true,
            path: abs,
            bytes: Buffer.byteLength(content, "utf-8"),
        });
    }
    catch (err) {
        return toolError(String(err));
    }
}
async function runTool(call) {
    const args = JSON.parse(call.function.arguments || "{}");
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
            return runGrep(String(args.pattern ?? ""), String(args.path ?? ""), args.glob != null ? String(args.glob) : undefined, args.max_results != null ? Number(args.max_results) : exports.GREP_DEFAULT_MAX_RESULTS);
        case "write_file":
            return runWriteFile(String(args.path ?? ""), String(args.content ?? ""));
        default:
            return toolError(`未知工具: ${call.function.name}`);
    }
}
function hooksFor(call) {
    return (exports.toolHooks[call.function.name] ?? {
        maxOutputChars: 4_000,
        before: [],
        after: [(0, hooks_js_1.truncateAfter)(4_000)],
    });
}
//# sourceMappingURL=tools.js.map