"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDiffContentProvider = registerDiffContentProvider;
exports.showEditDiffAndApply = showEditDiffAndApply;
exports.registerEditCommands = registerEditCommands;
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const SCHEME_LEFT = "bagent-old";
const SCHEME_RIGHT = "bagent-new";
const virtualContents = new Map();
class BagDiffContentProvider {
    provideTextDocumentContent(uri) {
        return virtualContents.get(uri.toString()) ?? "";
    }
}
function registerDiffContentProvider(context) {
    const provider = new BagDiffContentProvider();
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(SCHEME_LEFT, provider), vscode.workspace.registerTextDocumentContentProvider(SCHEME_RIGHT, provider));
}
let pending = null;
/** 程序关 diff 时忽略 onDidCloseTextDocument，避免二次收尾和焦点闪跳 */
let closingProgrammatically = false;
async function setPendingContext(on) {
    await vscode.commands.executeCommand("setContext", "bagent53.pendingEdit", on);
}
async function fileExists(uri) {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    }
    catch {
        return false;
    }
}
async function applyProposal(proposal) {
    const fileUri = vscode.Uri.file(proposal.path);
    const isDelete = proposal.newContent === "" && proposal.oldContent !== "";
    if (isDelete) {
        await vscode.workspace.fs.delete(fileUri);
        return true;
    }
    const exists = await fileExists(fileUri);
    if (!exists) {
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(proposal.newContent, "utf-8"));
        return true;
    }
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    edit.replace(fileUri, fullRange, proposal.newContent);
    return vscode.workspace.applyEdit(edit);
}
async function closeDiffTab(leftUri, rightUri, preserveFocus = true) {
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            if (!(tab.input instanceof vscode.TabInputTextDiff))
                continue;
            const { original, modified } = tab.input;
            if (original.toString() === leftUri.toString() &&
                modified.toString() === rightUri.toString()) {
                closingProgrammatically = true;
                try {
                    await vscode.window.tabGroups.close(tab, preserveFocus);
                }
                finally {
                    closingProgrammatically = false;
                }
                virtualContents.delete(leftUri.toString());
                virtualContents.delete(rightUri.toString());
                return;
            }
        }
    }
}
async function finishPending(allowed) {
    const session = pending;
    if (!session)
        return;
    pending = null;
    const { proposal, leftUri, rightUri } = session;
    const viewColumn = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.Active;
    try {
        if (allowed) {
            const ok = await applyProposal(proposal);
            if (ok) {
                // 先打开真实文件、再关 diff，避免关标签后短暂露出底层编辑器
                if (proposal.newContent !== "") {
                    await vscode.window.showTextDocument(vscode.Uri.file(proposal.path), {
                        preview: false,
                        viewColumn,
                    });
                }
                await closeDiffTab(leftUri, rightUri, true);
            }
            await setPendingContext(false);
            session.resolve(ok);
            return;
        }
        await closeDiffTab(leftUri, rightUri, true);
        await setPendingContext(false);
        session.resolve(false);
    }
    catch (err) {
        await setPendingContext(false);
        const text = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(`bagent: 写盘失败 — ${text}`);
        session.resolve(false);
    }
}
function urisForProposal(proposal) {
    const fileName = path.basename(proposal.path);
    const leftUri = vscode.Uri.from({
        scheme: SCHEME_LEFT,
        path: proposal.path,
        query: "left",
    });
    const rightUri = vscode.Uri.from({
        scheme: SCHEME_RIGHT,
        path: proposal.path,
        query: "right",
    });
    virtualContents.set(leftUri.toString(), proposal.oldContent);
    virtualContents.set(rightUri.toString(), proposal.newContent);
    return { leftUri, rightUri, title: `${fileName} (bagent 编辑预览)` };
}
async function openPendingDiff(proposal, resolve) {
    const { leftUri, rightUri, title } = urisForProposal(proposal);
    pending = { proposal, resolve, leftUri, rightUri };
    await setPendingContext(true);
    await vscode.commands.executeCommand("vscode.diff", leftUri, rightUri, title, {
        preview: false,
    });
    await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
}
/** 打开并排 diff，在编辑器标题栏 Accept / Reject */
function showEditDiffAndApply(proposal) {
    if (pending) {
        void finishPending(false);
    }
    return new Promise((resolve) => {
        void openPendingDiff(proposal, resolve);
    });
}
function registerEditCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand("bagent53.acceptEdit", () => finishPending(true)), vscode.commands.registerCommand("bagent53.rejectEdit", () => finishPending(false)), vscode.workspace.onDidCloseTextDocument((doc) => {
        if (!pending || closingProgrammatically)
            return;
        const scheme = doc.uri.scheme;
        if (scheme === SCHEME_LEFT || scheme === SCHEME_RIGHT) {
            void finishPending(false);
        }
    }));
}
//# sourceMappingURL=diffPreview.js.map