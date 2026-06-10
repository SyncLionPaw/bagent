import { readFileSync, statSync } from "node:fs";
import { formatEditProposal } from "./editProposal.js";
import {
  bufferLooksBinary,
  classifyByPath,
  kindHint,
} from "./fileKind.js";

function toolError(message: string): string {
  return JSON.stringify({ error: message });
}

function countMatches(content: string, oldString: string): number {
  if (!oldString) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const pos = content.indexOf(oldString, idx);
    if (pos === -1) break;
    count++;
    idx = pos + oldString.length;
  }
  return count;
}

/** 在已校验的绝对路径上计算 search/replace 提案（不写盘） */
export function runStrReplace(
  absPath: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): string {
  try {
    const st = statSync(absPath);
    if (!st.isFile()) {
      return toolError(`不是文件: ${absPath}`);
    }

    const kind = classifyByPath(absPath);
    if (
      kind === "image" ||
      kind === "pdf" ||
      kind === "spreadsheet" ||
      kind === "office" ||
      kind === "archive"
    ) {
      return toolError(`不支持对 ${kind} 文件做 str_replace，仅支持纯文本`);
    }

    const buf = readFileSync(absPath);
    if ((kind === null || kind === "text") && bufferLooksBinary(buf)) {
      return toolError(kindHint("binary"));
    }

    const content = buf.toString("utf-8");
    const matches = countMatches(content, oldString);

    if (matches === 0) {
      return toolError(
        "未找到 old_string，请用 read_file 核对文件内容（空格、换行与缩进须完全一致）",
      );
    }

    if (matches > 1 && !replaceAll) {
      return toolError(
        `old_string 出现 ${matches} 次，须唯一匹配或设置 replace_all=true`,
      );
    }

    let updated: string;
    if (replaceAll) {
      updated = content.split(oldString).join(newString);
    } else {
      const pos = content.indexOf(oldString);
      updated = content.slice(0, pos) + newString + content.slice(pos + oldString.length);
    }

    return formatEditProposal(absPath, content, updated);
  } catch (err) {
    return toolError(String(err));
  }
}
