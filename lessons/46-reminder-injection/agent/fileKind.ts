import { extname } from "node:path";

export type FileKind =
  | "text"
  | "image"
  | "pdf"
  | "spreadsheet"
  | "office"
  | "archive"
  | "binary";

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".ico",
  ".heic",
  ".heif",
  ".tiff",
  ".tif",
]);

const SPREADSHEET_EXT = new Set([".xlsx", ".xls", ".ods", ".numbers"]);

const OFFICE_EXT = new Set([".docx", ".doc", ".pptx", ".ppt", ".odt", ".odp"]);

const ARCHIVE_EXT = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".xz",
  ".7z",
  ".rar",
  ".jar",
  ".wasm",
]);

const TEXT_EXT = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".php",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".less",
  ".xml",
  ".svg",
  ".csv",
  ".tsv",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".sql",
  ".log",
  ".vue",
  ".svelte",
  ".lock",
]);

export function extensionOf(path: string): string {
  return extname(path).toLowerCase();
}

/** 按扩展名粗分；无扩展名或未知扩展名返回 null，读时再嗅探二进制 */
export function classifyByPath(path: string): FileKind | null {
  const ext = extensionOf(path);
  if (!ext) return null;
  if (ext === ".pdf") return "pdf";
  if (IMAGE_EXT.has(ext)) return "image";
  if (SPREADSHEET_EXT.has(ext)) return "spreadsheet";
  if (OFFICE_EXT.has(ext)) return "office";
  if (ARCHIVE_EXT.has(ext)) return "archive";
  if (TEXT_EXT.has(ext)) return "text";
  return null;
}

export function kindHint(kind: FileKind): string {
  switch (kind) {
    case "image":
      return "图片无法以文本读取；需要 OCR 或多模态视觉模型解析（开发中）";
    case "pdf":
      return "read_file 会用 pdf-parse 提取文本；扫描版 PDF 将提示 OCR（开发中）";
    case "spreadsheet":
      return "read_file 会用 xlsx 库导出各工作表为 CSV 文本；纯文本表格也可用 .csv";
    case "office":
      return "Word/PPT 等办公文档暂不支持解析，请导出为 PDF 或纯文本后再读";
    case "archive":
      return "压缩包不能当文本读取，请先解压再对内部文件 stat_file / read_file";
    case "binary":
      return "检测到二进制内容，无法以 UTF-8 文本显示";
    case "text":
      return "可用 read_file 直接读取";
  }
}

/** stat_file 字段：是否适合交给 read_file（含 PDF/Excel 解析） */
export function readableByReadFile(kind: FileKind | null): boolean {
  if (kind === null) return true;
  return kind === "text" || kind === "pdf" || kind === "spreadsheet";
}

const SNIFF_BYTES = 8192;

export function bufferLooksBinary(buf: Buffer): boolean {
  const n = Math.min(buf.length, SNIFF_BYTES);
  for (let i = 0; i < n; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}
