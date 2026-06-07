"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStrReplace = runStrReplace;
const node_fs_1 = require("node:fs");
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
/** 在已校验的绝对路径上执行 search/replace（UTF-8 纯文本） */
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
        let replacements;
        if (replaceAll) {
            updated = content.split(oldString).join(newString);
            replacements = matches;
        }
        else {
            const pos = content.indexOf(oldString);
            updated = content.slice(0, pos) + newString + content.slice(pos + oldString.length);
            replacements = 1;
        }
        (0, node_fs_1.writeFileSync)(absPath, updated, "utf-8");
        return JSON.stringify({
            ok: true,
            path: absPath,
            replacements,
            bytes: Buffer.byteLength(updated, "utf-8"),
        });
    }
    catch (err) {
        return toolError(String(err));
    }
}
//# sourceMappingURL=strReplace.js.map