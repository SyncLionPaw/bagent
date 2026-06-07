"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDefinitions = exports.toolHooks = exports.GREP_MAX_RESULTS_CAP = exports.GREP_DEFAULT_MAX_RESULTS = exports.GREP_MAX_CHARS = exports.READ_FILE_MAX_CHARS = exports.LS_MAX_CHARS = exports.PWD_MAX_CHARS = void 0;
exports.runTool = runTool;
exports.hooksFor = hooksFor;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const hooks_1 = require("./hooks");
const cwd = process.cwd();
const exampleFile = (0, node_path_1.resolve)(cwd, "package.json");
const exampleDir = cwd;
const SKIP_DIRS = new Set([".git", "node_modules"]);
exports.PWD_MAX_CHARS = 512;
exports.LS_MAX_CHARS = 4_000;
exports.READ_FILE_MAX_CHARS = 8_000;
exports.GREP_MAX_CHARS = 8_000;
exports.GREP_DEFAULT_MAX_RESULTS = 50;
exports.GREP_MAX_RESULTS_CAP = 200;
function toolDesc(base, maxChars) {
    return `${base} 返回文本上限 ${maxChars} 字符；超出时保留首尾，中间替换为截断说明。`;
}
function grepPathBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const path = args.path;
        if (typeof path !== "string" || !pathUnderCwd(path)) {
            throw new hooks_1.ToolAborted(toolError(`path 必须在 cwd (${cwd}) 下且为绝对路径，可先调用 pwd`));
        }
    };
}
exports.toolHooks = {
    pwd: {
        maxOutputChars: exports.PWD_MAX_CHARS,
        before: [],
        after: [(0, hooks_1.truncateAfter)(exports.PWD_MAX_CHARS)],
    },
    ls: {
        maxOutputChars: exports.LS_MAX_CHARS,
        before: [],
        after: [(0, hooks_1.truncateAfter)(exports.LS_MAX_CHARS)],
    },
    read_file: {
        maxOutputChars: exports.READ_FILE_MAX_CHARS,
        before: [],
        after: [(0, hooks_1.truncateAfter)(exports.READ_FILE_MAX_CHARS)],
    },
    grep: {
        maxOutputChars: exports.GREP_MAX_CHARS,
        before: [grepPathBefore()],
        after: [(0, hooks_1.truncateAfter)(exports.GREP_MAX_CHARS)],
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
            name: "read_file",
            description: toolDesc("读取文本文件内容。", exports.READ_FILE_MAX_CHARS),
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
function runReadFile(path) {
    const abs = absolutePath(path);
    if (!abs) {
        return toolError(`path 必须是绝对路径，例如 ${exampleFile}`);
    }
    try {
        const st = (0, node_fs_1.statSync)(abs);
        if (!st.isFile()) {
            return toolError(`不是文件: ${abs}`);
        }
        return (0, node_fs_1.readFileSync)(abs, "utf-8");
    }
    catch (err) {
        return toolError(String(err));
    }
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
        let content;
        try {
            const st = (0, node_fs_1.statSync)(file);
            if (!st.isFile())
                continue;
            content = (0, node_fs_1.readFileSync)(file, "utf-8");
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
function runTool(call) {
    const args = JSON.parse(call.function.arguments || "{}");
    switch (call.function.name) {
        case "pwd":
            return runPwd();
        case "ls":
            return runLs(String(args.path ?? ""));
        case "read_file":
            return runReadFile(String(args.path ?? ""));
        case "grep":
            return runGrep(String(args.pattern ?? ""), String(args.path ?? ""), args.glob != null ? String(args.glob) : undefined, args.max_results != null ? Number(args.max_results) : exports.GREP_DEFAULT_MAX_RESULTS);
        default:
            return toolError(`未知工具: ${call.function.name}`);
    }
}
function hooksFor(call) {
    return (exports.toolHooks[call.function.name] ?? {
        maxOutputChars: 4_000,
        before: [],
        after: [(0, hooks_1.truncateAfter)(4_000)],
    });
}
//# sourceMappingURL=tools.js.map