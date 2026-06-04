export const tools = [
  {
    type: "function",
    function: {
      name: "get_time",
      description: "获取当前日期时间（上海时区）。用户问现在几点、今天几号时使用。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "计算数学表达式。用户问算数、几步运算时使用。",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "仅含数字与 +-*/() 的式子，如 (128+256)*3",
          },
        },
        required: ["expression"],
      },
    },
  },
];

export async function runTool(call) {
  const { name, arguments: args } = call.function;

  if (name === "get_time") {
    return new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  }

  if (name === "calculate") {
    const { expression } = JSON.parse(args);
    const s = expression.replace(/\s/g, "");
    if (!/^[\d+\-*/().]+$/.test(s)) return "仅支持数字与 +-*/()";
    return String(Function(`"use strict";return (${s})`)());
  }

  return `未知工具: ${name}`;
}
