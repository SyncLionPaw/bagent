"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolHooks = exports.ASK_USER_QUESTION_MAX_CHARS = exports.RUN_COMMAND_RESULT_MAX_CHARS = exports.DELETE_FILE_RESULT_MAX_CHARS = exports.STR_REPLACE_RESULT_MAX_CHARS = exports.WRITE_FILE_RESULT_MAX_CHARS = exports.WRITE_FILE_MAX_CHARS = exports.GREP_MAX_RESULTS_CAP = exports.GREP_DEFAULT_MAX_RESULTS = exports.GREP_MAX_CHARS = exports.READ_FILE_MAX_CHARS = exports.STAT_FILE_MAX_CHARS = exports.LS_MAX_CHARS = exports.PWD_MAX_CHARS = void 0;
exports.getToolDefinitions = getToolDefinitions;
exports.runTool = runTool;
exports.hooksFor = hooksFor;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fileKind_js_1 = require("./fileKind.js");
const hooks_js_1 = require("./hooks.js");
const readDispatch_js_1 = require("./readDispatch.js");
const readFile_js_1 = require("./readFile.js");
const editProposal_js_1 = require("./editProposal.js");
const deleteFile_js_1 = require("./deleteFile.js");
const runCommand_js_1 = require("./runCommand.js");
const strReplace_js_1 = require("./strReplace.js");
const plan_js_1 = require("./plan.js");
const tavily_js_1 = require("./tavily.js");
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
exports.STR_REPLACE_RESULT_MAX_CHARS = 512;
exports.DELETE_FILE_RESULT_MAX_CHARS = 512;
exports.RUN_COMMAND_RESULT_MAX_CHARS = 16_000;
exports.ASK_USER_QUESTION_MAX_CHARS = 4_000;
const BLOCKED_WRITE_SEGMENTS = new Set([".git", "node_modules"]);
function toolDesc(base, maxChars) {
    return `${base} 返回文本上限 ${maxChars} 字符；超出时保留首尾，中间替换为截断说明。`;
}
function readFileBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const path = args.path;
        if (typeof path !== "string" || !path.trim()) {
            throw new hooks_js_1.ToolAborted(toolError("path 必须是绝对路径字符串"));
        }
        if (args.offset != null) {
            const offset = Number(args.offset);
            if (!Number.isFinite(offset) || offset < 1 || !Number.isInteger(offset)) {
                throw new hooks_js_1.ToolAborted(toolError("offset 须为 ≥1 的整数（1-based 起始行）"));
            }
        }
        if (args.limit != null) {
            const limit = Number(args.limit);
            if (!Number.isFinite(limit) || limit < 1 || !Number.isInteger(limit)) {
                throw new hooks_js_1.ToolAborted(toolError("limit 须为 ≥1 的整数（最多读取行数）"));
            }
        }
    };
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
const PLAN_METHODS = new Set(["read", "new", "replace", "update", "delete"]);
function planOperateBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const method = args.method;
        if (typeof method !== "string" || !PLAN_METHODS.has(method)) {
            throw new hooks_js_1.ToolAborted(toolError('method 必须是 "read"、"new"、"replace"、"update" 或 "delete"'));
        }
        const name = args.name;
        if (typeof name !== "string" || !(0, plan_js_1.sanitizePlanName)(name)) {
            throw new hooks_js_1.ToolAborted(toolError(`name 须为非空计划标识（≤${plan_js_1.PLAN_NAME_MAX_CHARS} 字符，字母数字 _ . -）`));
        }
        const content = args.content;
        if (typeof content !== "string") {
            throw new hooks_js_1.ToolAborted(toolError("content 必须是字符串"));
        }
        if (content.length > plan_js_1.PLAN_MAX_CHARS) {
            throw new hooks_js_1.ToolAborted(toolError(`content 超过上限 ${plan_js_1.PLAN_MAX_CHARS} 字符`));
        }
    };
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
function strReplaceBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const path = args.path;
        if (typeof path !== "string" || !isWritePathAllowed(path)) {
            throw new hooks_js_1.ToolAborted(toolError(`禁止写入：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env 文件`));
        }
        const oldString = args.old_string;
        if (typeof oldString !== "string" || !oldString) {
            throw new hooks_js_1.ToolAborted(toolError("old_string 必须是非空字符串"));
        }
        const newString = args.new_string;
        if (typeof newString !== "string") {
            throw new hooks_js_1.ToolAborted(toolError("new_string 必须是字符串"));
        }
        if (args.replace_all != null && typeof args.replace_all !== "boolean") {
            throw new hooks_js_1.ToolAborted(toolError("replace_all 须为布尔值"));
        }
    };
}
function deleteFileBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const path = args.path;
        if (typeof path !== "string" || !path.trim()) {
            throw new hooks_js_1.ToolAborted(toolError("path 必须是绝对路径字符串"));
        }
        if (!isWritePathAllowed(path)) {
            throw new hooks_js_1.ToolAborted(toolError(`禁止删除：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env 文件`));
        }
    };
}
function runCommandBefore() {
    return (ctx) => {
        const args = JSON.parse(ctx.call.function.arguments || "{}");
        const command = args.command;
        if (typeof command !== "string" || !command.trim()) {
            throw new hooks_js_1.ToolAborted(toolError("command 必须是非空字符串"));
        }
        if (command.length > 2_000) {
            throw new hooks_js_1.ToolAborted(toolError("command 超过 2000 字符上限"));
        }
        const check = (0, runCommand_js_1.checkCommandString)(command);
        if (!check.ok) {
            throw new hooks_js_1.ToolAborted(toolError(check.reason));
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
        before: [readFileBefore()],
        after: [(0, readFile_js_1.readFileTruncateAfter)(exports.READ_FILE_MAX_CHARS)],
    },
    grep: {
        maxOutputChars: exports.GREP_MAX_CHARS,
        before: [grepPathBefore()],
        after: [(0, hooks_js_1.truncateAfter)(exports.GREP_MAX_CHARS)],
    },
    write_file: {
        maxOutputChars: exports.WRITE_FILE_RESULT_MAX_CHARS,
        before: [writePathBefore()],
        after: [],
    },
    str_replace: {
        maxOutputChars: exports.STR_REPLACE_RESULT_MAX_CHARS,
        before: [strReplaceBefore()],
        after: [],
    },
    delete_file: {
        maxOutputChars: exports.DELETE_FILE_RESULT_MAX_CHARS,
        before: [deleteFileBefore()],
        after: [],
    },
    run_command: {
        maxOutputChars: exports.RUN_COMMAND_RESULT_MAX_CHARS,
        before: [runCommandBefore()],
        after: [(0, hooks_js_1.truncateAfter)(exports.RUN_COMMAND_RESULT_MAX_CHARS)],
    },
    web_search: {
        maxOutputChars: tavily_js_1.WEB_SEARCH_MAX_CHARS,
        before: [],
        after: [(0, hooks_js_1.truncateAfter)(tavily_js_1.WEB_SEARCH_MAX_CHARS)],
    },
    plan_operate: {
        maxOutputChars: plan_js_1.PLAN_RESULT_MAX_CHARS,
        before: [planOperateBefore()],
        after: [(0, hooks_js_1.truncateAfter)(plan_js_1.PLAN_RESULT_MAX_CHARS)],
    },
};
const webSearchDefinition = {
    type: "function",
    function: {
        name: "web_search",
        description: toolDesc("联网搜索（Tavily）。用户要搜一下、查新闻、查实时公开资料时使用。", tavily_js_1.WEB_SEARCH_MAX_CHARS),
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
    type: "function",
    function: {
        name: "ask_user_question",
        description: "向用户追问一条必要信息（必选场景：用户意图含糊、需指定文件名/路径/选项才能继续）。禁止用最终文字回复代替本工具。用户可跳过，hint 后自行决定。不要问已从 ls/read 能确定的事实。",
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
            description: toolDesc("读取文件；纯文本每行前带 1-based 行号（格式 `  12|代码`），可选 offset/limit 按行切片。PDF/Excel 等走解析；图片/Office/压缩包返回 hint。", exports.READ_FILE_MAX_CHARS),
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
            name: "plan_operate",
            description: "管理任务计划（Markdown 待办，临时文件），路径 ~/.bagent/{项目名}/{name}.md，自动放行。改计划前先 read。new/replace/update 维护条目；全部勾选完成或 delete（content 空）= 计划结束，文件会立刻删除不保留。delete 带 content 可删单项。",
            parameters: {
                type: "object",
                properties: {
                    method: {
                        type: "string",
                        enum: ["read", "new", "replace", "update", "delete"],
                        description: "read：读取；new/replace：整表；update：合并/勾选；delete 空 content：标记结束并删文件",
                    },
                    name: {
                        type: "string",
                        description: "计划标识，对应文件名（不含 .md），如 add-login、release-v2；同一 cwd 下可并存多份",
                    },
                    content: {
                        type: "string",
                        description: "read 可空。update：- [x] 勾选；全部完成会自动删文件。delete：空串=计划结束删文件；否则删指定条目",
                    },
                },
                required: ["method", "name", "content"],
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
    {
        type: "function",
        function: {
            name: "str_replace",
            description: "危险：在已有文本文件中做局部修改（exact match 搜索替换），优先于 write_file。" +
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
                        description: `目标文件绝对路径，例如 ${(0, node_path_1.resolve)(cwd, "notes.txt")}`,
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
        type: "function",
        function: {
            name: "delete_file",
            description: "危险：永久删除 cwd 下的单个文件（不可恢复）。" +
                "适用：用户明确要求删文件、清理临时/废弃脚本、移除不再需要的配置或测试产物。" +
                "不适用：删目录（仅删文件，目录请让用户手动处理）、清空文件内容（用 str_replace 或 write_file）、批量删多文件（逐个调用并分别审批）。" +
                "删除前可用 stat_file 或 read_file 确认路径与内容；误删无法撤销。" +
                "须在 cwd 下绝对路径；禁止 .git、node_modules、.env。写入前用户会审批。",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: `要删除的文件绝对路径，例如 ${(0, node_path_1.resolve)(cwd, "notes.txt")}`,
                    },
                },
                required: ["path"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "run_command",
            description: "危险：在 cwd 下执行白名单内的命令（不启 shell），捕获 stdout/stderr。" +
                "允许：curl（GET/HEAD 探 URL）、ps（看进程）、lsof（看端口）、" +
                "tsc --noEmit（TypeScript 类型检查）、node --check <file>（JS 语法检查）、" +
                "python3 -m py_compile <file>（Python 语法检查）。" +
                "npm/git 等编译运行类不在白名单。" +
                "不要用本工具代替专用工具：读用 ls/pwd/grep/read_file；写改用 write_file/str_replace；勿用 vim/nano/sed。" +
                "禁止 | ; & 重定向。执行前用户会审批。",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "完整命令一行，如 curl -sI https://example.com、lsof -i :8080、ps aux",
                    },
                },
                required: ["command"],
            },
        },
    },
];
function getToolDefinitions() {
    if (!(0, tavily_js_1.hasWebSearch)())
        return baseToolDefinitions;
    return [...baseToolDefinitions, webSearchDefinition];
}
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
async function runReadFile(path, offset, limit) {
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
        const raw = buf.toString("utf-8");
        const allLines = raw.split(/\r?\n/);
        const totalLines = allLines.length === 1 && allLines[0] === "" ? 0 : allLines.length;
        const startLine = Math.max(1, Math.floor(offset ?? 1));
        if (totalLines === 0)
            return "(空文件)";
        if (startLine > totalLines) {
            return toolError(`offset ${startLine} 超出文件行数 ${totalLines}`);
        }
        const text = (0, readFile_js_1.sliceAndNumberCapped)(raw, offset ?? 1, limit, exports.READ_FILE_MAX_CHARS);
        if (!text)
            return "(无内容)";
        return text;
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
        let oldContent = "";
        if ((0, node_fs_1.existsSync)(abs)) {
            const st = (0, node_fs_1.statSync)(abs);
            if (!st.isFile()) {
                return toolError(`不是文件: ${abs}`);
            }
            oldContent = (0, node_fs_1.readFileSync)(abs, "utf-8");
        }
        return (0, editProposal_js_1.formatEditProposal)(abs, oldContent, content);
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
            return runReadFile(String(args.path ?? ""), args.offset != null ? Number(args.offset) : undefined, args.limit != null ? Number(args.limit) : undefined);
        case "grep":
            return runGrep(String(args.pattern ?? ""), String(args.path ?? ""), args.glob != null ? String(args.glob) : undefined, args.max_results != null ? Number(args.max_results) : exports.GREP_DEFAULT_MAX_RESULTS);
        case "write_file":
            return runWriteFile(String(args.path ?? ""), String(args.content ?? ""));
        case "str_replace": {
            const abs = pathUnderCwd(String(args.path ?? ""));
            if (!abs || !isWritePathAllowed(String(args.path ?? ""))) {
                return toolError(`禁止写入：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env`);
            }
            return (0, strReplace_js_1.runStrReplace)(abs, String(args.old_string ?? ""), String(args.new_string ?? ""), args.replace_all === true);
        }
        case "delete_file": {
            const abs = pathUnderCwd(String(args.path ?? ""));
            if (!abs || !isWritePathAllowed(String(args.path ?? ""))) {
                return toolError(`禁止删除：path 须在 cwd (${cwd}) 下，且不能位于 .git、node_modules，也不能是 .env`);
            }
            return (0, deleteFile_js_1.runDeleteFile)(abs);
        }
        case "run_command":
            return (0, runCommand_js_1.runCommand)(String(args.command ?? ""));
        case "plan_operate":
            return (0, plan_js_1.planOperate)(String(args.method ?? ""), String(args.name ?? ""), String(args.content ?? ""));
        case "web_search": {
            const query = String(args.query ?? "").trim();
            if (!query)
                return toolError("query 不能为空");
            try {
                return await (0, tavily_js_1.tavilySearch)(query);
            }
            catch (err) {
                const e = err;
                return `搜索失败：${e.cause?.code ?? e.message}`;
            }
        }
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