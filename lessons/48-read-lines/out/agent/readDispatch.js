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
exports.IMAGE_OCR_HINT = exports.PDF_OCR_HINT = void 0;
exports.readPdf = readPdf;
exports.readSpreadsheet = readSpreadsheet;
exports.unsupportedReadResult = unsupportedReadResult;
const node_fs_1 = require("node:fs");
const XLSX = __importStar(require("xlsx"));
const fileKind_js_1 = require("./fileKind.js");
exports.PDF_OCR_HINT = "当前pdf文件 可能需要ocr解析（开发中）";
exports.IMAGE_OCR_HINT = "图片需要 OCR 或多模态视觉模型解析（开发中）";
function fromPdfModule(mod) {
    return typeof mod === "function" ? mod : mod.default;
}
async function getPdfParse() {
    if (typeof __dirname !== "undefined") {
        const mod = require("pdf-parse");
        return fromPdfModule(mod);
    }
    const mod = (await Promise.resolve().then(() => __importStar(require("pdf-parse"))));
    return fromPdfModule(mod);
}
async function readPdf(abs) {
    const pdfParse = await getPdfParse();
    try {
        const data = await pdfParse((0, node_fs_1.readFileSync)(abs));
        const text = (data.text ?? "").trim();
        if (!text.replace(/\s/g, "").length) {
            return JSON.stringify({
                ok: false,
                kind: "pdf",
                hint: exports.PDF_OCR_HINT,
                pages: data.numpages ?? null,
            });
        }
        return text;
    }
    catch (err) {
        return JSON.stringify({
            ok: false,
            kind: "pdf",
            error: `PDF 解析失败: ${err}`,
            hint: exports.PDF_OCR_HINT,
        });
    }
}
function readSpreadsheet(abs) {
    try {
        const wb = XLSX.readFile(abs, { cellDates: true });
        const parts = [];
        for (const name of wb.SheetNames) {
            const sheet = wb.Sheets[name];
            if (!sheet)
                continue;
            parts.push(`## ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`);
        }
        return parts.join("\n\n") || "(空表格)";
    }
    catch (err) {
        return JSON.stringify({
            ok: false,
            kind: "spreadsheet",
            error: `表格解析失败: ${err}`,
            hint: (0, fileKind_js_1.kindHint)("spreadsheet"),
        });
    }
}
function unsupportedReadResult(kind) {
    const hint = kind === "image" ? exports.IMAGE_OCR_HINT : (0, fileKind_js_1.kindHint)(kind);
    return JSON.stringify({
        ok: false,
        kind,
        error: hint,
        hint,
    });
}
//# sourceMappingURL=readDispatch.js.map