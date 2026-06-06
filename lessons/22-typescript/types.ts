/** 本课类型系统示例 — npm run ch22:types */

// 1. 基本类型
const title: string = "bagent";
const year: number = 2026;
const ok: boolean = true;

// 2. 数组
const tags: string[] = ["agent", "typescript"];
const ports: Array<number> = [3020, 5173];

// 3. 对象与 type
type User = {
  id: number;
  name: string;
};
const user: User = { id: 1, name: "lei" };

// 4. 可选属性 ?
type Config = {
  baseUrl: string;
  timeout?: number;
};
const cfg: Config = { baseUrl: "https://api.deepseek.com" };

// 5. 函数类型
function add(a: number, b: number): number {
  return a + b;
}

type Handler = (msg: string) => void;
const log: Handler = (msg) => console.log("[log]", msg);

// 6. 联合类型 |
type Status = "idle" | "running" | "done";

function statusLabel(s: Status): string {
  switch (s) {
    case "idle":
      return "等待";
    case "running":
      return "运行中";
    case "done":
      return "完成";
  }
}

// 7. 类型收窄
function formatId(x: string | number): string {
  if (typeof x === "string") return x.toUpperCase();
  return String(x);
}

// 8. interface（对象形状常用写法）
interface ToolResult {
  ok: boolean;
  data: string;
}
const readJson: ToolResult = { ok: true, data: '{"name":"bagent"}' };

// 9. 可辨识联合（第 23 课 messages 会用到）
type PreviewMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null };

function previewRole(msg: PreviewMessage): string {
  return msg.role;
}

console.log({
  title,
  year,
  user,
  cfg,
  add: add(1, 2),
  status: statusLabel("running"),
  formatId: formatId(42),
  readJson,
  roles: [
    previewRole({ role: "user", content: "hi" }),
    previewRole({ role: "assistant", content: null }),
  ],
});
