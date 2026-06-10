"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNumberedLines = formatNumberedLines;
exports.sliceAndNumber = sliceAndNumber;
exports.readFileTruncNote = readFileTruncNote;
exports.sliceAndNumberCapped = sliceAndNumberCapped;
exports.isNumberedReadFileOutput = isNumberedReadFileOutput;
exports.truncateNumberedLinesHead = truncateNumberedLinesHead;
exports.readFileTruncateAfter = readFileTruncateAfter;
const hooks_js_1 = require("./hooks.js");
/** read_file 文本输出：每行前加 1-based 行号，便于编码定位 */
function formatNumberedLines(lines, startLine) {
    if (!lines.length)
        return "";
    const endLine = startLine + lines.length - 1;
    const width = String(endLine).length;
    return lines
        .map((line, i) => `${String(startLine + i).padStart(width, " ")}|${line}`)
        .join("\n");
}
function sliceAndNumber(content, offset = 1, limit) {
    const allLines = content.split(/\r?\n/);
    const totalLines = allLines.length === 1 && allLines[0] === "" ? 0 : allLines.length;
    const startLine = Math.max(1, Math.floor(offset));
    const startIdx = startLine - 1;
    if (totalLines === 0 || startIdx >= totalLines) {
        return { text: "", startLine, endLine: startLine - 1, totalLines };
    }
    const maxLines = limit != null ? Math.max(1, Math.floor(limit)) : totalLines - startIdx;
    const sliced = allLines.slice(startIdx, startIdx + maxLines);
    const endLine = startLine + sliced.length - 1;
    let text = formatNumberedLines(sliced, startLine);
    const showingPartial = startLine > 1 || endLine < totalLines;
    if (showingPartial && totalLines > 0) {
        text = `(lines ${startLine}-${endLine} of ${totalLines})\n${text}`;
    }
    return { text, startLine, endLine, totalLines };
}
const READ_FILE_TRUNC_NOTE_RE = /\n\n\[已截断：共 \d+ 行，已显示第 \d+-\d+ 行；继续请 read_file\(path, offset=\d+\)\]$/;
function readFileTruncNote(startLine, endLine, totalLines) {
    return `\n\n[已截断：共 ${totalLines} 行，已显示第 ${startLine}-${endLine} 行；继续请 read_file(path, offset=${endLine + 1})]`;
}
function numberedSliceText(content, startLine, lineCount, totalLines, withTruncNote) {
    const slice = sliceAndNumber(content, startLine, lineCount);
    if (!withTruncNote || slice.endLine >= totalLines)
        return slice.text;
    return slice.text + readFileTruncNote(slice.startLine, slice.endLine, totalLines);
}
/** 按行切片并限制字符数；超出时从开头保留完整行，并提示 offset 翻页 */
function sliceAndNumberCapped(content, offset = 1, limit, maxChars = 8_000) {
    const allLines = content.split(/\r?\n/);
    const totalLines = allLines.length === 1 && allLines[0] === "" ? 0 : allLines.length;
    if (totalLines === 0)
        return "";
    const startLine = Math.max(1, Math.floor(offset));
    const startIdx = startLine - 1;
    if (startIdx >= totalLines)
        return sliceAndNumber(content, offset, limit).text;
    const maxLines = limit != null ? Math.max(1, Math.floor(limit)) : totalLines - startIdx;
    const full = numberedSliceText(content, startLine, maxLines, totalLines, false);
    if (full.length <= maxChars)
        return full;
    let lo = 1;
    let hi = maxLines;
    let best = 0;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const trial = numberedSliceText(content, startLine, mid, totalLines, true);
        if (trial.length <= maxChars) {
            best = mid;
            lo = mid + 1;
        }
        else {
            hi = mid - 1;
        }
    }
    if (best > 0) {
        return numberedSliceText(content, startLine, best, totalLines, true);
    }
    const note = readFileTruncNote(startLine, startLine, totalLines);
    const oneLine = numberedSliceText(content, startLine, 1, totalLines, false);
    const budget = maxChars - note.length;
    if (budget <= 0)
        return oneLine.slice(0, maxChars);
    return oneLine.slice(0, budget) + note;
}
function isNumberedReadFileOutput(output) {
    return (/^\(lines \d+-\d+ of \d+\)\n/.test(output) || /^\s*\d+\|/.test(output));
}
/** after 钩子：行号文本从头截断；PDF 等仍走 truncateMiddle */
function truncateNumberedLinesHead(output, maxChars) {
    if (output.length <= maxChars)
        return output;
    let body = output.replace(READ_FILE_TRUNC_NOTE_RE, "");
    let totalLines = 0;
    const header = body.match(/^\(lines (\d+)-(\d+) of (\d+)\)\n/);
    if (header) {
        totalLines = Number(header[3]);
        body = body.slice(header[0].length);
    }
    const lines = body.split("\n");
    const kept = [];
    let used = header ? header[0].length : 0;
    for (const line of lines) {
        const sep = kept.length > 0 ? 1 : 0;
        if (used + sep + line.length > maxChars)
            break;
        kept.push(line);
        used += sep + line.length;
    }
    let endLine = 0;
    for (let i = kept.length - 1; i >= 0; i--) {
        const m = kept[i].match(/^(\d+)\|/);
        if (m) {
            endLine = Number(m[1]);
            break;
        }
    }
    const startLine = header ? Number(header[1]) : endLine > 0 ? 1 : 0;
    if (!totalLines)
        totalLines = endLine;
    let result = header
        ? `(lines ${startLine}-${endLine} of ${totalLines})\n${kept.join("\n")}`
        : kept.join("\n");
    if (endLine > 0 && endLine < totalLines) {
        result += readFileTruncNote(startLine, endLine, totalLines);
    }
    if (result.length > maxChars) {
        return result.slice(0, maxChars);
    }
    return result;
}
function readFileTruncateAfter(maxChars) {
    return ({ output }) => {
        if (isNumberedReadFileOutput(output)) {
            return truncateNumberedLinesHead(output, maxChars);
        }
        return (0, hooks_js_1.truncateMiddle)(output, maxChars);
    };
}
//# sourceMappingURL=readFile.js.map