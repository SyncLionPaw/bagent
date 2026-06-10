"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenizeCommand = tokenizeCommand;
exports.validateCommandWhitelist = validateCommandWhitelist;
exports.checkCommandString = checkCommandString;
exports.runCommand = runCommand;
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
const cwd = process.cwd();
const MAX_OUTPUT_CHARS = 16_000;
const TIMEOUT_MS = 120_000;
/** 已有专用工具，禁止 run_command 调用 */
const BLOCKED_PROGRAMS = new Set([
    "ls",
    "pwd",
    "rm",
    "rmdir",
    "mv",
    "cp",
    "cat",
    "head",
    "tail",
    "find",
    "grep",
    "rg",
    "ag",
    "awk",
    "wget",
    "chmod",
    "chown",
    "sudo",
    "bash",
    "sh",
    "zsh",
    "fish",
    "dash",
    "touch",
    "mkdir",
]);
/** 终端编辑/流式改文件——用 write_file / str_replace */
const EDITOR_PROGRAMS = new Set([
    "vim",
    "vi",
    "nvim",
    "neovim",
    "nano",
    "emacs",
    "micro",
    "ed",
    "pico",
    "sed",
    "tee",
]);
/** 编译/运行类，留给后续沙箱课 */
const DEFERRED_SANDBOX_PROGRAMS = new Set([
    "npm",
    "npx",
    "tsx",
    "ts-node",
    "deno",
    "bun",
    "yarn",
    "pnpm",
    "git",
    "make",
    "cmake",
    "pip",
    "pip3",
    "cargo",
    "ruby",
    "java",
    "javac",
    "mvn",
    "gradle",
    "dotnet",
]);
const SHELL_METACHAR = /[|;&$<>()`\\\n\r]/;
const WHITELIST_HINT = "curl、ps、lsof、tsc、node、python3";
/** curl 禁止写文件 / 上传 / 改方法的参数 */
const CURL_DENIED_FLAGS = new Set([
    "-o",
    "--output",
    "-O",
    "-T",
    "--upload-file",
    "-d",
    "--data",
    "--data-raw",
    "--data-binary",
    "--data-urlencode",
    "-F",
    "--form",
]);
const CURL_DENIED_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH", "CONNECT", "TRACE"]);
function toolError(message) {
    return JSON.stringify({ error: message });
}
/** 简易引号感知分词（不启 shell） */
function tokenizeCommand(command) {
    const trimmed = command.trim();
    if (!trimmed)
        return [];
    const tokens = [];
    let cur = "";
    let quote = null;
    for (let i = 0; i < trimmed.length; i++) {
        const c = trimmed[i];
        if (quote) {
            if (c === quote)
                quote = null;
            else
                cur += c;
            continue;
        }
        if (c === '"' || c === "'") {
            quote = c;
            continue;
        }
        if (/\s/.test(c)) {
            if (cur) {
                tokens.push(cur);
                cur = "";
            }
            continue;
        }
        cur += c;
    }
    if (quote)
        throw new Error("命令字符串引号未闭合");
    if (cur)
        tokens.push(cur);
    return tokens;
}
function validateCommandWhitelist(argv) {
    if (!argv.length) {
        return { ok: false, reason: "命令不能为空" };
    }
    const program = (0, node_path_1.basename)(argv[0]).toLowerCase();
    const args = argv.slice(1);
    if (EDITOR_PROGRAMS.has(program)) {
        return {
            ok: false,
            reason: `「${program}」是终端编辑/写文件类命令，请用 write_file、str_replace 或 delete_file，勿用 run_command`,
        };
    }
    if (BLOCKED_PROGRAMS.has(program)) {
        return {
            ok: false,
            reason: `「${program}」已有专用工具（如 pwd/ls/grep/read_file/delete_file），请用对应工具而非 run_command`,
        };
    }
    if (DEFERRED_SANDBOX_PROGRAMS.has(program)) {
        return {
            ok: false,
            reason: `「${program}」属于编译/运行类命令，将在后续沙箱课开放；本课白名单仅 ${WHITELIST_HINT}`,
        };
    }
    switch (program) {
        case "curl":
            return validateCurl(args);
        case "ps":
            return validatePs(args);
        case "lsof":
            return validateLsof(args);
        case "tsc":
            return validateTsc(args);
        case "node":
            return validateNodeCheck(args);
        case "python3":
        case "python":
            return validatePython(args);
        default:
            return {
                ok: false,
                reason: `「${program}」不在白名单。允许：${WHITELIST_HINT}`,
            };
    }
}
function validateCurl(args) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (CURL_DENIED_FLAGS.has(arg)) {
            return {
                ok: false,
                reason: `curl ${arg} 不在白名单（禁止写文件/上传/POST body；探测 URL 用 GET/HEAD 即可）`,
            };
        }
        if (arg === "-X" || arg === "--request") {
            const method = (args[i + 1] ?? "GET").toUpperCase();
            if (CURL_DENIED_METHODS.has(method)) {
                return {
                    ok: false,
                    reason: `curl 仅允许 GET/HEAD，禁止 -X ${method}`,
                };
            }
        }
        if (arg.startsWith("-X") && arg.length > 2) {
            const method = arg.slice(2).toUpperCase();
            if (CURL_DENIED_METHODS.has(method)) {
                return { ok: false, reason: `curl 仅允许 GET/HEAD，禁止 -X${method}` };
            }
        }
    }
    const hasHttpUrl = args.some((a) => a.startsWith("http://") || a.startsWith("https://"));
    if (!hasHttpUrl) {
        return {
            ok: false,
            reason: "curl 须带 http:// 或 https:// URL（只读探测，不用 -o 落盘）",
        };
    }
    return { ok: true, program: "curl", args };
}
function validatePs(_args) {
    return { ok: true, program: "ps", args: _args };
}
function validateLsof(args) {
    if (args.includes("-r") || args.includes("--repeat")) {
        return { ok: false, reason: "lsof 禁止 -r/--repeat 持续轮询（用单次 lsof 即可）" };
    }
    return { ok: true, program: "lsof", args };
}
/** tsc：只允许 --noEmit（只读类型检查，不产出文件） */
function validateTsc(args) {
    if (!args.includes("--noEmit")) {
        return {
            ok: false,
            reason: "tsc 只允许 --noEmit 模式（只读类型检查）；不允许编译产出文件",
        };
    }
    const denied = ["--outDir", "--outFile", "--declarationDir", "--watch", "-w"];
    for (const d of denied) {
        if (args.includes(d)) {
            return { ok: false, reason: `tsc 不允许 ${d}（只读诊断模式）` };
        }
    }
    return { ok: true, program: "tsc", args };
}
/** node：只允许 --check（语法检查，不执行） */
function validateNodeCheck(args) {
    if (!args.includes("--check")) {
        return {
            ok: false,
            reason: "node 只允许 --check 模式（只读语法检查，不执行代码）",
        };
    }
    return { ok: true, program: "node", args };
}
/** python3/python：只允许 -m py_compile（语法检查）或 -c（表达式求值） */
function validatePython(args) {
    if (args[0] === "-m" && args[1] === "py_compile") {
        return { ok: true, program: "python3", args };
    }
    if (args[0] === "-c") {
        if (!args[1]) {
            return { ok: false, reason: "python3 -c 须提供代码字符串" };
        }
        return { ok: true, program: "python3", args };
    }
    return {
        ok: false,
        reason: "python3 只允许 `-m py_compile <file>`（语法检查）或 `-c <expr>`（求值）",
    };
}
function checkCommandString(command) {
    if (SHELL_METACHAR.test(command)) {
        return {
            ok: false,
            reason: "禁止 shell 元字符（| ; & $ 重定向等）；传单一程序与参数，不启 shell",
        };
    }
    let argv;
    try {
        argv = tokenizeCommand(command);
    }
    catch (err) {
        return { ok: false, reason: String(err) };
    }
    return validateCommandWhitelist(argv);
}
function formatOutput(stdout, stderr, exitCode, signal) {
    const parts = [];
    if (exitCode != null)
        parts.push(`exit: ${exitCode}`);
    if (signal)
        parts.push(`signal: ${signal}`);
    const header = parts.length ? `[${parts.join(", ")}]\n` : "";
    let body = "";
    if (stdout)
        body += stdout;
    if (stderr) {
        if (body)
            body += "\n";
        body += stderr.startsWith("--- stderr ---") ? stderr : `--- stderr ---\n${stderr}`;
    }
    if (!body)
        body = "(无输出)";
    const full = header + body;
    if (full.length <= MAX_OUTPUT_CHARS)
        return full;
    const note = `\n\n[输出已截断：原文 ${full.length} 字符，仅保留前 ${MAX_OUTPUT_CHARS} 字符]\n`;
    return full.slice(0, MAX_OUTPUT_CHARS) + note;
}
function runCommand(command) {
    const check = checkCommandString(command);
    if (!check.ok)
        return toolError(check.reason);
    const argv = tokenizeCommand(command);
    const program = argv[0];
    const args = argv.slice(1);
    const result = (0, node_child_process_1.spawnSync)(program, args, {
        cwd,
        encoding: "utf-8",
        timeout: TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
        shell: false,
        env: { ...process.env, FORCE_COLOR: "0" },
    });
    if (result.error) {
        const err = result.error;
        if (err.code === "ETIMEDOUT") {
            return toolError(`命令超时（>${TIMEOUT_MS / 1000}s）：${command}`);
        }
        if (err.code === "ENOENT") {
            return toolError(`找不到命令「${program}」，请确认已安装且在 PATH 中`);
        }
        return toolError(String(err.message ?? err));
    }
    const output = formatOutput(result.stdout ?? "", result.stderr ?? "", result.status, result.signal);
    return JSON.stringify({
        ok: result.status === 0,
        command,
        exitCode: result.status,
        output,
    });
}
//# sourceMappingURL=runCommand.js.map