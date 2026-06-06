# 第 22 课 · TypeScript 入门与类型系统

**约 30 分钟** · 第三阶段开篇

第 1–21 课用 **JavaScript**（`.mjs`）。从本课起造代码智能体（类似 Claude Code）改用 **TypeScript**（`.ts`）。

**TypeScript = JavaScript + 静态类型系统**。你写的 `.ts` 在运行前会先被 **检查**（`tsc`），再交给 `tsx` / Node 当普通 JS 执行——类型标注在运行时会被擦掉，**不改变运行结果**，但能提前拦住大量笔误。

---

## 1. 第一个例子

[`hello.ts`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/22-typescript/hello.ts)：

```typescript
function greet(name: string): string {
  return `你好，${name}`;
}

console.log(greet("bagent"));
```

| 写法 | 含义 |
|------|------|
| `name: string` | 参数必须是字符串 |
| `: string`（函数后） | 返回值必须是字符串 |
| 去掉所有类型 | 逻辑与 JS 完全相同 |

```bash
npm run ch22
```

项目根目录 [`tsconfig.json`](https://github.com/SyncLionPaw/bagent/blob/main/tsconfig.json) 开了 `strict: true`，类型检查更严。只检查、不生成文件：

```bash
npx tsc
```

---

## 2. 类型系统在检查什么

编译器为**每个变量、表达式**推断或要求一个**类型**。类型不兼容就报错，例如：

```typescript
const n: number = "abc"; // ❌ Type 'string' is not assignable to type 'number'
greet(123);              // ❌ Argument of type 'number' is not assignable to parameter of type 'string'
```

常见内置类型：

| 类型 | 例子 |
|------|------|
| `string` | `"hello"` |
| `number` | `42`, `3.14` |
| `boolean` | `true`, `false` |
| `null` / `undefined` | 空值（`strict` 下要显式处理） |
| `void` | 函数无返回值时用 |
| `unknown` | 不知道类型时的安全顶类型（少用，知道形状就用具体类型） |

---

## 3. 数组与对象

```typescript
const tags: string[] = ["agent", "ts"];
const ports: Array<number> = [3020, 5173];

type User = {
  id: number;
  name: string;
};
const user: User = { id: 1, name: "lei" };
```

- **`type 名字 = { ... }`**：给对象形状起别名，后面写 `User` 即可复用。
- **可选属性** `?`：可以省略该字段。

```typescript
type Config = {
  baseUrl: string;
  timeout?: number; // 可有可无
};
```

完整可运行示例见 [`types.ts`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/22-typescript/types.ts)：

```bash
npm run ch22:types
```

---

## 4. 函数类型

```typescript
function add(a: number, b: number): number {
  return a + b;
}

type Handler = (msg: string) => void;
const log: Handler = (msg) => console.log(msg);
```

- 参数、返回值都可以标注类型。
- **`void`**：不关心返回值（例如只打日志的函数）。

---

## 5. 联合类型 `|`

表示「只能是几种之一」：

```typescript
type Status = "idle" | "running" | "done";

function statusLabel(s: Status): string {
  switch (s) {
    case "idle": return "等待";
    case "running": return "运行中";
    case "done": return "完成";
  }
}
```

也用于「多种类型之一」：

```typescript
function formatId(x: string | number): string {
  if (typeof x === "string") return x.toUpperCase();
  return String(x);
}
```

---

## 6. 类型收窄（Narrowing）

联合类型里，编译器不知道你手里是哪一种，不能随便访问只属于某一类的属性。用 **`if` / `switch` / `typeof`** 分岔之后，TS 会**收窄**当前分支的类型：

```typescript
function formatId(x: string | number): string {
  if (typeof x === "string") {
    // 这里 x 被收窄为 string
    return x.toUpperCase();
  }
  // 这里 x 被收窄为 number
  return String(x);
}
```

第 23 课的 `Message` 用 `role` 区分四种消息，也是同一套思路（**可辨识联合**）。

---

## 7. `interface` 与 `type`

两者都能描述对象形状，本课程里任选一种即可：

```typescript
interface ToolResult {
  ok: boolean;
  data: string;
}

type ToolResult = {
  ok: boolean;
  data: string;
};
```

| | `interface` | `type` |
|---|-------------|--------|
| 对象形状 | ✅ 常用 | ✅ 常用 |
| 联合 `A \| B` | ❌ | ✅ |
| 交叉、映射等高级用法 | 较少用 | ✅ |

Agent 里 `messages` 一条消息可能是四种 `role` 之一，适合用 **`type` + 联合**（下一课）。

---

## 8. 可辨识联合（预告第 23 课）

多个对象共用字段（如 `role`），用它的值区分分支。第 23 课会为每种 `role` 单独定义 `interface`，再合成 `type Message = ...`：

```typescript
interface UserMessage { role: "user"; content: string }
interface AssistantMessage { role: "assistant"; content: string | null }
type Message = UserMessage | AssistantMessage;

function onMessage(msg: Message) {
  switch (msg.role) {
    case "user":
      return msg.content; // msg 被收窄为 UserMessage
    case "assistant":
      return msg.content ?? "(调用工具中)";
  }
}
```

---

## 检查点

- [ ] 能说出 TS 类型在**编译期**检查、**运行时**擦除吗？
- [ ] 能写出带参数、返回值的函数类型吗？
- [ ] 能解释 `string | number` 和 `typeof` 收窄吗？
- [ ] 知道 `type` 联合类型与第 23 课 `messages` 的关系吗？

---

## 下一课

[第 23 课 · Agent 的 messages 设计](/chapters/23-agent-messages)

[← 第 21 课](/chapters/21-js-runtimes)
