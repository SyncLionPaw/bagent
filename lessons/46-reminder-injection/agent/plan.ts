import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

const cwd = process.cwd();

/** 与 ~/.bagent/deepseek-api-key 等同级的用户数据目录 */
export const BAGENT_HOME = join(homedir(), ".bagent");

export const PLAN_MAX_CHARS = 8_000;
export const PLAN_NAME_MAX_CHARS = 64;
/** plan 工具返回值上限（含 read 返回的 todos / markdown） */
export const PLAN_RESULT_MAX_CHARS = 8_000;

export type PlanMethod = "read" | "new" | "replace" | "update" | "delete";

export type PlanTodo = { text: string; done: boolean };

export type PlanSnapshot = {
  name: string;
  method: PlanMethod;
  todos: PlanTodo[];
  done: number;
  total: number;
  deleted?: boolean;
};

type TodoItem = PlanTodo;

function sanitizeSegment(raw: string, fallback: string): string {
  const s = raw.trim().replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
  return s || fallback;
}

function projectName(): string {
  return sanitizeSegment(basename(resolve(cwd)), "project");
}

export function sanitizePlanName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > PLAN_NAME_MAX_CHARS) return null;
  const s = sanitizeSegment(trimmed, "");
  return s || null;
}

/** ~/.bagent/{项目名}/ — 项目名取自当前 cwd 目录名 */
export function planDir(): string {
  return join(BAGENT_HOME, projectName());
}

export function planFilePath(name: string): string {
  const safe = sanitizePlanName(name);
  if (!safe) throw new Error("invalid plan name");
  return join(planDir(), `${safe}.md`);
}

function planHeader(name: string): string {
  return `# ${name}\n`;
}

function normalizeContent(planName: string, content: string): string {
  const header = planHeader(planName);
  const trimmed = content.trim();
  if (!trimmed) return header;

  if (trimmed.startsWith("#")) {
    return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
  }

  const items = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^-\s*\[[ xX]\]/.test(line)) return line;
      if (line.startsWith("- ")) return `- [ ] ${line.slice(2)}`;
      return `- [ ] ${line}`;
    });

  return header + items.join("\n") + "\n";
}

export function parseTodos(markdown: string): TodoItem[] {
  const items: TodoItem[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (m) {
      items.push({ text: m[2].trim(), done: m[1].toLowerCase() === "x" });
    }
  }
  return items;
}

function formatPlan(planName: string, todos: TodoItem[]): string {
  const header = planHeader(planName);
  if (!todos.length) return header;
  return (
    header +
    todos.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") +
    "\n"
  );
}

function taskTextsFromContent(content: string): string[] {
  const texts: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^-\s*\[[ xX\-]\]\s*(.*)$/);
    texts.push((m ? m[1] : trimmed.replace(/^-\s*/, "")).trim());
  }
  return texts.filter(Boolean);
}

type UpdatePatch = { updates: TodoItem[]; removes: string[] };

/** update：普通行合并/勾选；`- [-] 条目` 表示从计划中移除该条 */
function parseUpdatePatch(planName: string, content: string): UpdatePatch {
  const trimmed = content.trim();
  if (!trimmed) return { updates: [], removes: [] };
  if (trimmed.startsWith("#")) {
    return { updates: parseTodos(normalizeContent(planName, trimmed)), removes: [] };
  }

  const updates: TodoItem[] = [];
  const removes: string[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const remove = t.match(/^-\s*\[-\]\s*(.*)$/);
    if (remove) {
      const text = remove[1].trim();
      if (text) removes.push(text);
      continue;
    }
    const todo = t.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (todo) {
      updates.push({ text: todo[2].trim(), done: todo[1].toLowerCase() === "x" });
      continue;
    }
    if (t.startsWith("- ")) {
      updates.push({ text: t.slice(2).trim(), done: false });
      continue;
    }
    updates.push({ text: t, done: false });
  }
  return { updates, removes };
}

function writePlanBody(planName: string, body: string, method: PlanMethod) {
  const path = planFilePath(planName);
  ensureDir();
  writeFileSync(path, body, "utf-8");
  const todos = parseTodos(body);
  return JSON.stringify({
    ok: true,
    method,
    name: planName,
    path,
    todos,
    done: todos.filter((t) => t.done).length,
    total: todos.length,
    items: todos.length,
  });
}

function ensureDir(): void {
  mkdirSync(planDir(), { recursive: true });
}

function readPlan(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

function planStats(todos: PlanTodo[]) {
  const done = todos.filter((t) => t.done).length;
  return { todos, done, total: todos.length };
}

/** 从 plan_operate 工具返回值解析 UI 用快照（读磁盘上的 plan 文件） */
export function snapshotFromToolOutput(output: string): PlanSnapshot | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(output) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!data.ok || typeof data.name !== "string" || typeof data.method !== "string") {
    return null;
  }
  const name = data.name;
  const method = data.method as PlanMethod;
  if (data.cleared === "all") {
    return { name, method, todos: [], done: 0, total: 0, deleted: true };
  }
  if (Array.isArray(data.todos)) {
    const todos = data.todos as PlanTodo[];
    const { done, total } = planStats(todos);
    return { name, method, todos, done, total };
  }
  const path = typeof data.path === "string" ? data.path : planFilePath(name);
  const body = existsSync(path) ? readPlan(path) : null;
  const { todos, done, total } = planStats(body ? parseTodos(body) : []);
  return { name, method, todos, done, total };
}

export function planOperate(method: PlanMethod, name: string, content: string): string {
  const planName = sanitizePlanName(name);
  if (!planName) {
    return JSON.stringify({
      error: `name 须为非空标识（≤${PLAN_NAME_MAX_CHARS} 字符，仅字母数字 _ . -）`,
    });
  }
  if (content.length > PLAN_MAX_CHARS) {
    return JSON.stringify({ error: `content 超过上限 ${PLAN_MAX_CHARS} 字符` });
  }

  const path = planFilePath(planName);

  switch (method) {
    case "read": {
      const body = readPlan(path);
      if (!body) {
        return JSON.stringify({
          ok: true,
          method: "read",
          name: planName,
          path,
          todos: [],
          done: 0,
          total: 0,
          note: "计划不存在",
        });
      }
      const todos = parseTodos(body);
      return JSON.stringify({
        ok: true,
        method: "read",
        name: planName,
        path,
        todos,
        done: todos.filter((t) => t.done).length,
        total: todos.length,
        markdown: body,
      });
    }
    case "new":
    case "replace": {
      const body = normalizeContent(planName, content);
      return writePlanBody(planName, body, method);
    }
    case "update": {
      const existing = readPlan(path);
      const patch = parseUpdatePatch(planName, content);
      if (!existing) {
        const body = formatPlan(planName, patch.updates);
        return writePlanBody(planName, body, "update");
      }

      const map = new Map(
        parseTodos(existing).map((t) => [t.text.toLowerCase(), t] as const),
      );
      for (const r of patch.removes) {
        map.delete(r.toLowerCase());
      }
      for (const u of patch.updates) {
        map.set(u.text.toLowerCase(), u);
      }
      const body = formatPlan(planName, [...map.values()]);
      return writePlanBody(planName, body, "update");
    }
    case "delete": {
      if (!existsSync(path)) {
        return JSON.stringify({
          ok: true,
          method: "delete",
          name: planName,
          path,
          note: "计划文件不存在",
        });
      }

      const hint = content.trim();
      if (!hint) {
        unlinkSync(path);
        return JSON.stringify({
          ok: true,
          method: "delete",
          name: planName,
          path,
          cleared: "all",
        });
      }

      const existingTodos = parseTodos(readPlan(path)!);
      const toRemove = new Set(
        taskTextsFromContent(hint).map((t) => t.toLowerCase()),
      );
      const remaining = existingTodos.filter((t) => !toRemove.has(t.text.toLowerCase()));

      if (!remaining.length) {
        unlinkSync(path);
        return JSON.stringify({
          ok: true,
          method: "delete",
          name: planName,
          path,
          cleared: "all",
          removed: existingTodos.length,
        });
      }

      const body = formatPlan(planName, remaining);
      return JSON.stringify({
        ...JSON.parse(writePlanBody(planName, body, "delete")),
        removed: existingTodos.length - remaining.length,
      });
    }
    default:
      return JSON.stringify({ error: `未知 method: ${method}` });
  }
}
