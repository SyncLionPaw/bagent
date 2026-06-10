"use strict";
/** 写盘类工具：只产出改法，不落盘（第 52 课） */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDIT_TOOL_NAMES = void 0;
exports.isEditTool = isEditTool;
exports.formatEditProposal = formatEditProposal;
exports.compactProposalSummary = compactProposalSummary;
exports.formatAppliedEdit = formatAppliedEdit;
exports.parseEditProposal = parseEditProposal;
exports.EDIT_TOOL_NAMES = new Set(["write_file", "str_replace", "delete_file"]);
function isEditTool(name) {
    return exports.EDIT_TOOL_NAMES.has(name);
}
function formatEditProposal(path, oldContent, newContent) {
    return JSON.stringify({
        ok: true,
        proposal: true,
        path,
        oldContent,
        newContent,
    });
}
/** 写入 history / 侧栏展示：不含全文，避免被 truncate 破坏 */
function compactProposalSummary(p) {
    return JSON.stringify({
        ok: true,
        proposal: true,
        path: p.path,
        oldChars: p.oldContent.length,
        newChars: p.newContent.length,
        pending: true,
    });
}
function formatAppliedEdit(path, newContent, diagnostics) {
    return JSON.stringify({
        ok: true,
        path,
        applied: true,
        bytes: Buffer.byteLength(newContent, "utf-8"),
        ...(diagnostics ? { diagnostics } : {}),
    });
}
function parseEditProposal(output) {
    try {
        const v = JSON.parse(output);
        if (v.ok === true &&
            v.proposal === true &&
            typeof v.path === "string" &&
            typeof v.oldContent === "string" &&
            typeof v.newContent === "string") {
            return v;
        }
    }
    catch {
        /* 非提案 JSON */
    }
    return null;
}
//# sourceMappingURL=editProposal.js.map