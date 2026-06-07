import { color } from "../36-tool-hooks/color.js";
import type { AgentEvent } from "./agent/events.js";

const METHOD_LABEL: Record<string, string> = {
  read: "查看",
  new: "新建",
  replace: "重写",
  update: "更新",
  delete: "删除",
};

export function printPlanUpdated(event: Extract<AgentEvent, { type: "PlanUpdated" }>): void {
  const label = METHOD_LABEL[event.method] ?? event.method;
  console.log(color.tool(`\n  📋 计划 ${event.name} · ${label}`));

  if (event.deleted) {
    console.log(color.meta("  （计划已删除）"));
    return;
  }

  if (event.total > 0) {
    const pct = Math.round((event.done / event.total) * 100);
    console.log(color.meta(`  进度 ${event.done}/${event.total} (${pct}%)`));
  }

  for (const item of event.todos) {
    const mark = item.done ? color.user("✓") : color.meta("○");
    const text = item.done ? color.meta(item.text) : item.text;
    console.log(`    ${mark} ${text}`);
  }

  if (!event.todos.length) {
    console.log(color.meta("  （暂无待办条目）"));
  }
}
