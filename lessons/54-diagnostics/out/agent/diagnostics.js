"use strict";
/**
 * 第 54 课：编辑写盘后，按文件扩展名自动运行诊断
 *
 * 诊断在 loop.ts 里 editApply() 返回 true（文件已写盘）之后调用。
 * 工具未安装（ENOENT）或无报错时静默返回空串，不干扰正常输出。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDiagnosticAfterEdit = runDiagnosticAfterEdit;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const cwd = process.cwd();
const DIAG_TIMEOUT_MS = 30_000;
const DIAG_MAX_CHARS = 3_000;
// ---------------------------------------------------------------------------
// 各语言诊断实现
// ---------------------------------------------------------------------------
function diagCli(cmd, args, label) {
    const r = (0, node_child_process_1.spawnSync)(cmd, args, {
        cwd,
        encoding: "utf-8",
        timeout: DIAG_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        shell: false,
        env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });
    if (r.error) {
        // ENOENT：工具没装，静默跳过
        if (r.error.code === "ENOENT")
            return "";
        return `\n\n[${label}] 运行失败：${r.error.message}`;
    }
    if (r.status === 0)
        return ""; // 无错误，不打扰 LLM
    const raw = [r.stdout, r.stderr].filter(Boolean).join("\n").trim();
    const out = raw.length > DIAG_MAX_CHARS
        ? raw.slice(0, DIAG_MAX_CHARS) + `\n…（已截断，原文 ${raw.length} 字符）`
        : raw;
    return `\n\n[${label} 发现错误]\n${out}`;
}
function diagTsc(_filePath) {
    // tsc --noEmit 从 cwd 读 tsconfig.json，检查整个项目
    if (!(0, node_fs_1.existsSync)((0, node_path_1.join)(cwd, "tsconfig.json")))
        return "";
    return diagCli("tsc", ["--noEmit"], "TypeScript 类型检查");
}
function diagPython(filePath) {
    return diagCli("python3", ["-m", "py_compile", filePath], "Python 语法检查");
}
function diagNodeSyntax(filePath) {
    return diagCli("node", ["--check", filePath], "Node.js 语法检查");
}
// ---------------------------------------------------------------------------
// 按扩展名分发的注册表
// ---------------------------------------------------------------------------
const diagRegistry = {
    ".ts": diagTsc,
    ".tsx": diagTsc,
    ".py": diagPython,
    ".js": diagNodeSyntax,
    ".mjs": diagNodeSyntax,
    ".cjs": diagNodeSyntax,
};
/**
 * 根据文件扩展名运行对应诊断。
 * 在 editApply() 返回 true（文件已写盘）之后调用。
 * 返回可追加到 tool result 的字符串，无报错时为空串。
 */
function runDiagnosticAfterEdit(filePath) {
    const fn = diagRegistry[(0, node_path_1.extname)(filePath).toLowerCase()];
    if (!fn)
        return "";
    try {
        return fn(filePath);
    }
    catch {
        return "";
    }
}
//# sourceMappingURL=diagnostics.js.map