import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { kindHint, type FileKind } from "./fileKind.js";

export const PDF_OCR_HINT = "当前pdf文件 可能需要ocr解析（开发中）";

export const IMAGE_OCR_HINT =
  "图片需要 OCR 或多模态视觉模型解析（开发中）";

type PdfParseResult = { text?: string; numpages?: number };
type PdfParseFn = (buf: Buffer) => Promise<PdfParseResult>;
type PdfMod = PdfParseFn | { default: PdfParseFn };

function fromPdfModule(mod: PdfMod): PdfParseFn {
  return typeof mod === "function" ? mod : mod.default;
}

async function getPdfParse(): Promise<PdfParseFn> {
  if (typeof __dirname !== "undefined") {
    const mod = require("pdf-parse") as PdfMod;
    return fromPdfModule(mod);
  }
  const mod = (await import("pdf-parse")) as PdfMod;
  return fromPdfModule(mod);
}

export async function readPdf(abs: string): Promise<string> {
  const pdfParse = await getPdfParse();
  try {
    const data = await pdfParse(readFileSync(abs));
    const text = (data.text ?? "").trim();
    if (!text.replace(/\s/g, "").length) {
      return JSON.stringify({
        ok: false,
        kind: "pdf",
        hint: PDF_OCR_HINT,
        pages: data.numpages ?? null,
      });
    }
    return text;
  } catch (err) {
    return JSON.stringify({
      ok: false,
      kind: "pdf",
      error: `PDF 解析失败: ${err}`,
      hint: PDF_OCR_HINT,
    });
  }
}

export function readSpreadsheet(abs: string): string {
  try {
    const wb = XLSX.readFile(abs, { cellDates: true });
    const parts: string[] = [];
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      if (!sheet) continue;
      parts.push(`## ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`);
    }
    return parts.join("\n\n") || "(空表格)";
  } catch (err) {
    return JSON.stringify({
      ok: false,
      kind: "spreadsheet",
      error: `表格解析失败: ${err}`,
      hint: kindHint("spreadsheet"),
    });
  }
}

export function unsupportedReadResult(kind: FileKind): string {
  const hint = kind === "image" ? IMAGE_OCR_HINT : kindHint(kind);
  return JSON.stringify({
    ok: false,
    kind,
    error: hint,
    hint,
  });
}
