import { readFileSync, statSync } from "node:fs";
import { formatEditProposal } from "./editProposal.js";

function toolError(message: string): string {
  return JSON.stringify({ error: message });
}

/** 在已校验的绝对路径上产出删除提案（不 unlink） */
export function runDeleteFile(absPath: string): string {
  try {
    const st = statSync(absPath);
    if (st.isDirectory()) {
      return toolError(`是目录，delete_file 仅删除文件: ${absPath}`);
    }
    if (!st.isFile()) {
      return toolError(`不是普通文件: ${absPath}`);
    }

    const content = readFileSync(absPath, "utf-8");
    return formatEditProposal(absPath, content, "");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return toolError(`文件不存在: ${absPath}`);
    }
    return toolError(String(err));
  }
}
