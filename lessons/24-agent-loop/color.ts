const tty = process.stdout.isTTY;

function paint(code: number, text: string): string {
  return tty ? `\x1b[${code}m${text}\x1b[0m` : text;
}

/** 终端着色（非 TTY 时原样输出） */
export const color = {
  ai: (s: string) => paint(36, s),
  tool: (s: string) => paint(33, s),
  toolResult: (s: string) => paint(90, s),
  meta: (s: string) => paint(90, s),
  user: (s: string) => paint(32, s),
};
