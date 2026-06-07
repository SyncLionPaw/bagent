export function evalExpr(expr: string): number {
  const trimmed = expr.trim();
  if (!trimmed) throw new Error("请输入算式");
  if (!/^[\d+\-*/().%\s]+$/.test(trimmed)) {
    throw new Error("算式含非法字符");
  }
  const result = Function(`"use strict"; return (${trimmed})`)() as unknown;
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("无法得到有效数字");
  }
  return result;
}
