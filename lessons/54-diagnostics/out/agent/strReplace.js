"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStrReplace = runStrReplace;
const node_fs_1 = require("node:fs");
const editProposal_js_1 = require("./editProposal.js");
const fileKind_js_1 = require("./fileKind.js");
function toolError(message) {
    return JSON.stringify({ error: message });
}
function countMatches(content, oldString) {
    if (!oldString)
        return 0;
    let count = 0;
    let idx = 0;
    while (true) {
        const pos = content.indexOf(oldString, idx);
        if (pos === -1)
            break;
        count++;
        idx = pos + oldString.length;
    }
    return count;
}
/** 在已校验的绝对路径上计算 search/replace 提案（不写盘） */
function runStrReplace(absPath, oldString, newString, replaceAll = false) {
    try {
        const st = (0, node_fs_1.statSync)(absPath);
        if (!st.isFile()) {
            return toolError(`不是文件: ${absPath}`);
        }
        const kind = (0, fileKind_js_1.classifyByPath)(absPath);
        if (kind === "image" ||
            kind === "pdf" ||
            kind === "spreadsheet" ||
            kind === "office" ||
            kind === "archive") {
            return toolError(`不支持对 ${kind} 文件做 str_replace，仅支持纯文本`);
        }
        const buf = (0, node_fs_1.readFileSync)(absPath);
        if ((kind === null || kind === "text") && (0, fileKind_js_1.bufferLooksBinary)(buf)) {
            return toolError((0, fileKind_js_1.kindHint)("binary"));
        }
        const content = buf.toString("utf-8");
        const matches = countMatches(content, oldString);
        if (matches === 0) {
            return toolError("未找到 old_string，请用 read_file 核对文件内容（空格、换行与缩进须完全一致）");
        }
        if (matches > 1 && !replaceAll) {
            return toolError(`old_string 出现 ${matches} 次，须唯一匹配或设置 replace_all=true`);
        }
        let updated;
        if (replaceAll) {
            updated = content.split(oldString).join(newString);
        }
        else {
            const pos = content.indexOf(oldString);
            updated = content.slice(0, pos) + newString + content.slice(pos + oldString.length);
        }
        return (0, editProposal_js_1.formatEditProposal)(absPath, content, updated);
    }
    catch (err) {
        return toolError(String(err));
    }
}
//# sourceMappingURL=strReplace.js.map