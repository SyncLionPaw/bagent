"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_RESULT_MAX_CHARS = exports.PLAN_NAME_MAX_CHARS = exports.PLAN_MAX_CHARS = exports.BAGENT_HOME = void 0;
exports.sanitizePlanName = sanitizePlanName;
exports.planDir = planDir;
exports.planFilePath = planFilePath;
exports.parseTodos = parseTodos;
exports.snapshotFromToolOutput = snapshotFromToolOutput;
exports.planOperate = planOperate;
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const cwd = process.cwd();
/** 与 ~/.bagent/deepseek-api-key 等同级的用户数据目录 */
exports.BAGENT_HOME = (0, node_path_1.join)((0, node_os_1.homedir)(), ".bagent");
exports.PLAN_MAX_CHARS = 8_000;
exports.PLAN_NAME_MAX_CHARS = 64;
/** plan 工具返回值上限（含 read 返回的 todos / markdown） */
exports.PLAN_RESULT_MAX_CHARS = 8_000;
function sanitizeSegment(raw, fallback) {
    const s = raw.trim().replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
    return s || fallback;
}
function projectName() {
    return sanitizeSegment((0, node_path_1.basename)((0, node_path_1.resolve)(cwd)), "project");
}
function sanitizePlanName(raw) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > exports.PLAN_NAME_MAX_CHARS)
        return null;
    const s = sanitizeSegment(trimmed, "");
    return s || null;
}
/** ~/.bagent/{项目名}/ — 项目名取自当前 cwd 目录名 */
function planDir() {
    return (0, node_path_1.join)(exports.BAGENT_HOME, projectName());
}
function planFilePath(name) {
    const safe = sanitizePlanName(name);
    if (!safe)
        throw new Error("invalid plan name");
    return (0, node_path_1.join)(planDir(), `${safe}.md`);
}
function planHeader(name) {
    return `# ${name}\n`;
}
function normalizeContent(planName, content) {
    const header = planHeader(planName);
    const trimmed = content.trim();
    if (!trimmed)
        return header;
    if (trimmed.startsWith("#")) {
        return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
    }
    const items = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
        if (/^-\s*\[[ xX]\]/.test(line))
            return line;
        if (line.startsWith("- "))
            return `- [ ] ${line.slice(2)}`;
        return `- [ ] ${line}`;
    });
    return header + items.join("\n") + "\n";
}
function parseTodos(markdown) {
    const items = [];
    for (const line of markdown.split(/\r?\n/)) {
        const m = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
        if (m) {
            items.push({ text: m[2].trim(), done: m[1].toLowerCase() === "x" });
        }
    }
    return items;
}
function formatPlan(planName, todos) {
    const header = planHeader(planName);
    if (!todos.length)
        return header;
    return (header +
        todos.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") +
        "\n");
}
function taskTextsFromContent(content) {
    const texts = [];
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        const m = trimmed.match(/^-\s*\[[ xX\-]\]\s*(.*)$/);
        texts.push((m ? m[1] : trimmed.replace(/^-\s*/, "")).trim());
    }
    return texts.filter(Boolean);
}
/** update：普通行合并/勾选；`- [-] 条目` 表示从计划中移除该条 */
function parseUpdatePatch(planName, content) {
    const trimmed = content.trim();
    if (!trimmed)
        return { updates: [], removes: [] };
    if (trimmed.startsWith("#")) {
        return { updates: parseTodos(normalizeContent(planName, trimmed)), removes: [] };
    }
    const updates = [];
    const removes = [];
    for (const line of trimmed.split(/\r?\n/)) {
        const t = line.trim();
        if (!t)
            continue;
        const remove = t.match(/^-\s*\[-\]\s*(.*)$/);
        if (remove) {
            const text = remove[1].trim();
            if (text)
                removes.push(text);
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
function shouldRemovePlanFile(todos) {
    if (!todos.length)
        return true;
    return todos.every((t) => t.done);
}
function finishPlanFile(planName, method, todos, extra) {
    const path = planFilePath(planName);
    if ((0, node_fs_1.existsSync)(path))
        (0, node_fs_1.unlinkSync)(path);
    const { done, total } = planStats(todos);
    return JSON.stringify({
        ok: true,
        method,
        name: planName,
        path,
        todos,
        done,
        total,
        items: total,
        finished: true,
        cleared: "all",
        note: "计划已结束，临时文件已删除",
        ...extra,
    });
}
/** 写入计划；全部完成或已无条目时直接删文件（临时工作文件不保留） */
function commitTodos(planName, todos, method, extra) {
    if (shouldRemovePlanFile(todos)) {
        return finishPlanFile(planName, method, todos, extra);
    }
    const path = planFilePath(planName);
    ensureDir();
    (0, node_fs_1.writeFileSync)(path, formatPlan(planName, todos), "utf-8");
    const { done, total } = planStats(todos);
    return JSON.stringify({
        ok: true,
        method,
        name: planName,
        path,
        todos,
        done,
        total,
        items: total,
        ...extra,
    });
}
function ensureDir() {
    (0, node_fs_1.mkdirSync)(planDir(), { recursive: true });
}
function readPlan(path) {
    if (!(0, node_fs_1.existsSync)(path))
        return null;
    return (0, node_fs_1.readFileSync)(path, "utf-8");
}
function planStats(todos) {
    const done = todos.filter((t) => t.done).length;
    return { todos, done, total: todos.length };
}
/** 从 plan_operate 工具返回值解析 UI 用快照（读磁盘上的 plan 文件） */
function snapshotFromToolOutput(output) {
    let data;
    try {
        data = JSON.parse(output);
    }
    catch {
        return null;
    }
    if (!data.ok || typeof data.name !== "string" || typeof data.method !== "string") {
        return null;
    }
    const name = data.name;
    const method = data.method;
    if (data.cleared === "all" || data.finished === true) {
        const todos = Array.isArray(data.todos) ? data.todos : [];
        const { done, total } = planStats(todos);
        return { name, method, todos, done, total, deleted: true };
    }
    if (Array.isArray(data.todos)) {
        const todos = data.todos;
        const { done, total } = planStats(todos);
        return { name, method, todos, done, total };
    }
    const path = typeof data.path === "string" ? data.path : planFilePath(name);
    const body = (0, node_fs_1.existsSync)(path) ? readPlan(path) : null;
    const { todos, done, total } = planStats(body ? parseTodos(body) : []);
    return { name, method, todos, done, total };
}
function planOperate(method, name, content) {
    const planName = sanitizePlanName(name);
    if (!planName) {
        return JSON.stringify({
            error: `name 须为非空标识（≤${exports.PLAN_NAME_MAX_CHARS} 字符，仅字母数字 _ . -）`,
        });
    }
    if (content.length > exports.PLAN_MAX_CHARS) {
        return JSON.stringify({ error: `content 超过上限 ${exports.PLAN_MAX_CHARS} 字符` });
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
            const todos = parseTodos(normalizeContent(planName, content));
            return commitTodos(planName, todos, method);
        }
        case "update": {
            const existing = readPlan(path);
            const patch = parseUpdatePatch(planName, content);
            if (!existing) {
                return commitTodos(planName, patch.updates, "update");
            }
            const map = new Map(parseTodos(existing).map((t) => [t.text.toLowerCase(), t]));
            for (const r of patch.removes) {
                map.delete(r.toLowerCase());
            }
            for (const u of patch.updates) {
                map.set(u.text.toLowerCase(), u);
            }
            return commitTodos(planName, [...map.values()], "update");
        }
        case "delete": {
            if (!(0, node_fs_1.existsSync)(path)) {
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
                const existingTodos = parseTodos(readPlan(path));
                return finishPlanFile(planName, "delete", existingTodos);
            }
            const existingTodos = parseTodos(readPlan(path));
            const toRemove = new Set(taskTextsFromContent(hint).map((t) => t.toLowerCase()));
            const remaining = existingTodos.filter((t) => !toRemove.has(t.text.toLowerCase()));
            const removed = existingTodos.length - remaining.length;
            return commitTodos(planName, remaining, "delete", { removed });
        }
        default:
            return JSON.stringify({ error: `未知 method: ${method}` });
    }
}
//# sourceMappingURL=plan.js.map