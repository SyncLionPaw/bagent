import { basename, isAbsolute, resolve, sep } from "node:path";
import type { ToolCall } from "./messages.js";

const cwd = process.cwd();
const BLOCKED_SEGMENTS = new Set([".git", "node_modules"]);

function pathUnderCwd(path: string): string | null {
  if (!isAbsolute(path)) return null;
  const normalized = resolve(path);
  const root = resolve(cwd);
  if (normalized === root || normalized.startsWith(root + sep)) {
    return normalized;
  }
  return null;
}

/** cwd 下且非 .git / node_modules / .env */
export function isSafeReadPath(path: string): boolean {
  const abs = pathUnderCwd(path);
  if (!abs) return false;
  if (abs.split(sep).some((p) => BLOCKED_SEGMENTS.has(p))) return false;
  const base = basename(abs);
  if (base === ".env" || base.startsWith(".env.")) return false;
  return true;
}

/** 合规只读工具可跳过 UI 审批（仍走 before 校验） */
export function isAutoApproved(call: ToolCall): boolean {
  const args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
  const name = call.function.name;

  if (name === "pwd") return true;

  if (name === "ls" || name === "stat_file" || name === "read_file" || name === "grep") {
    const path = args.path;
    return typeof path === "string" && isSafeReadPath(path);
  }

  return false;
}
