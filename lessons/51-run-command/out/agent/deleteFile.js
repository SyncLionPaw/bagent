"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDeleteFile = runDeleteFile;
const node_fs_1 = require("node:fs");
function toolError(message) {
    return JSON.stringify({ error: message });
}
/** 在已校验的绝对路径上删除单个文件 */
function runDeleteFile(absPath) {
    try {
        const st = (0, node_fs_1.statSync)(absPath);
        if (st.isDirectory()) {
            return toolError(`是目录，delete_file 仅删除文件: ${absPath}`);
        }
        if (!st.isFile()) {
            return toolError(`不是普通文件: ${absPath}`);
        }
        (0, node_fs_1.unlinkSync)(absPath);
        return JSON.stringify({ ok: true, path: absPath });
    }
    catch (err) {
        const code = err.code;
        if (code === "ENOENT") {
            return toolError(`文件不存在: ${absPath}`);
        }
        return toolError(String(err));
    }
}
//# sourceMappingURL=deleteFile.js.map