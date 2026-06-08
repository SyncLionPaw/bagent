import * as path from "node:path";
import * as vscode from "vscode";

const SCHEME_LEFT = "bagent-old";
const SCHEME_RIGHT = "bagent-new";

const virtualContents = new Map<string, string>();

class BagDiffContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {
    return virtualContents.get(uri.toString()) ?? "";
  }
}

export function registerDiffContentProvider(context: vscode.ExtensionContext): void {
  const provider = new BagDiffContentProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME_LEFT, provider),
    vscode.workspace.registerTextDocumentContentProvider(SCHEME_RIGHT, provider),
  );
}

export type EditProposalView = {
  path: string;
  oldContent: string;
  newContent: string;
};

type PendingEdit = {
  proposal: EditProposalView;
  resolve: (allowed: boolean) => void;
  leftUri: vscode.Uri;
  rightUri: vscode.Uri;
};

let pending: PendingEdit | null = null;
/** 程序关 diff 时忽略 onDidCloseTextDocument，避免二次收尾和焦点闪跳 */
let closingProgrammatically = false;

async function setPendingContext(on: boolean): Promise<void> {
  await vscode.commands.executeCommand("setContext", "bagent53.pendingEdit", on);
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function applyProposal(proposal: EditProposalView): Promise<boolean> {
  const fileUri = vscode.Uri.file(proposal.path);
  const isDelete = proposal.newContent === "" && proposal.oldContent !== "";

  if (isDelete) {
    await vscode.workspace.fs.delete(fileUri);
    return true;
  }

  const exists = await fileExists(fileUri);
  if (!exists) {
    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(proposal.newContent, "utf-8"),
    );
    return true;
  }

  const doc = await vscode.workspace.openTextDocument(fileUri);
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  );
  edit.replace(fileUri, fullRange, proposal.newContent);
  return vscode.workspace.applyEdit(edit);
}

async function closeDiffTab(
  leftUri: vscode.Uri,
  rightUri: vscode.Uri,
  preserveFocus = true,
): Promise<void> {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (!(tab.input instanceof vscode.TabInputTextDiff)) continue;
      const { original, modified } = tab.input;
      if (
        original.toString() === leftUri.toString() &&
        modified.toString() === rightUri.toString()
      ) {
        closingProgrammatically = true;
        try {
          await vscode.window.tabGroups.close(tab, preserveFocus);
        } finally {
          closingProgrammatically = false;
        }
        virtualContents.delete(leftUri.toString());
        virtualContents.delete(rightUri.toString());
        return;
      }
    }
  }
}

async function finishPending(allowed: boolean): Promise<void> {
  const session = pending;
  if (!session) return;
  pending = null;

  const { proposal, leftUri, rightUri } = session;
  const viewColumn =
    vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.Active;

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
  } catch (err) {
    await setPendingContext(false);
    const text = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`bagent: 写盘失败 — ${text}`);
    session.resolve(false);
  }
}

function urisForProposal(proposal: EditProposalView): {
  leftUri: vscode.Uri;
  rightUri: vscode.Uri;
  title: string;
} {
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

async function openPendingDiff(
  proposal: EditProposalView,
  resolve: (allowed: boolean) => void,
): Promise<void> {
  const { leftUri, rightUri, title } = urisForProposal(proposal);
  pending = { proposal, resolve, leftUri, rightUri };
  await setPendingContext(true);

  await vscode.commands.executeCommand("vscode.diff", leftUri, rightUri, title, {
    preview: false,
  });
  await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
}

/** 打开并排 diff，在编辑器标题栏 Accept / Reject */
export function showEditDiffAndApply(proposal: EditProposalView): Promise<boolean> {
  if (pending) {
    void finishPending(false);
  }
  return new Promise<boolean>((resolve) => {
    void openPendingDiff(proposal, resolve);
  });
}

export function registerEditCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("bagent53.acceptEdit", () => finishPending(true)),
    vscode.commands.registerCommand("bagent53.rejectEdit", () => finishPending(false)),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      if (!pending || closingProgrammatically) return;
      const scheme = doc.uri.scheme;
      if (scheme === SCHEME_LEFT || scheme === SCHEME_RIGHT) {
        void finishPending(false);
      }
    }),
  );
}
