"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeReadPath = isSafeReadPath;
exports.isAutoApproved = isAutoApproved;
const node_path_1 = require("node:path");
const cwd = process.cwd();
const BLOCKED_SEGMENTS = new Set([".git", "node_modules"]);
function pathUnderCwd(path) {
    if (!(0, node_path_1.isAbsolute)(path))
        return null;
    const normalized = (0, node_path_1.resolve)(path);
    const root = (0, node_path_1.resolve)(cwd);
    if (normalized === root || normalized.startsWith(root + node_path_1.sep)) {
        return normalized;
    }
    return null;
}
/** cwd 下且非 .git / node_modules / .env */
function isSafeReadPath(path) {
    const abs = pathUnderCwd(path);
    if (!abs)
        return false;
    if (abs.split(node_path_1.sep).some((p) => BLOCKED_SEGMENTS.has(p)))
        return false;
    const base = (0, node_path_1.basename)(abs);
    if (base === ".env" || base.startsWith(".env."))
        return false;
    return true;
}
/** 合规只读工具可跳过 UI 审批（仍走 before 校验） */
function isAutoApproved(call) {
    const args = JSON.parse(call.function.arguments || "{}");
    const name = call.function.name;
    if (name === "pwd")
        return true;
    if (name === "ls" || name === "stat_file" || name === "read_file" || name === "grep") {
        const path = args.path;
        return typeof path === "string" && isSafeReadPath(path);
    }
    return false;
}
//# sourceMappingURL=autoApprove.js.map