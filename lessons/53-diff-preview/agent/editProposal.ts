/** 写盘类工具：只产出改法，不落盘（第 52 课） */

export type EditProposalPayload = {
  ok: true;
  proposal: true;
  path: string;
  oldContent: string;
  newContent: string;
};

export const EDIT_TOOL_NAMES = new Set(["write_file", "str_replace", "delete_file"]);

export function isEditTool(name: string): boolean {
  return EDIT_TOOL_NAMES.has(name);
}

export function formatEditProposal(
  path: string,
  oldContent: string,
  newContent: string,
): string {
  return JSON.stringify({
    ok: true,
    proposal: true,
    path,
    oldContent,
    newContent,
  } satisfies EditProposalPayload);
}

/** 写入 history / 侧栏展示：不含全文，避免被 truncate 破坏 */
export function compactProposalSummary(p: EditProposalPayload): string {
  return JSON.stringify({
    ok: true,
    proposal: true,
    path: p.path,
    oldChars: p.oldContent.length,
    newChars: p.newContent.length,
    pending: true,
  });
}

export function formatAppliedEdit(path: string, newContent: string): string {
  return JSON.stringify({
    ok: true,
    path,
    applied: true,
    bytes: Buffer.byteLength(newContent, "utf-8"),
  });
}

export function parseEditProposal(output: string): EditProposalPayload | null {
  try {
    const v = JSON.parse(output) as Record<string, unknown>;
    if (
      v.ok === true &&
      v.proposal === true &&
      typeof v.path === "string" &&
      typeof v.oldContent === "string" &&
      typeof v.newContent === "string"
    ) {
      return v as EditProposalPayload;
    }
  } catch {
    /* 非提案 JSON */
  }
  return null;
}
