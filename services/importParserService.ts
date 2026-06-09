import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ImportFileType } from "@/types/models";

export type ParsedImportRow = Record<string, unknown>;

export interface ParseImportRowsOptions {
  bankPreset?: "abc" | "cmb";
  onProgress?: (percent: number, label: string) => void;
}

export function parseImportRows(
  fileType: ImportFileType,
  content: string | ArrayBuffer,
  options: ParseImportRowsOptions = {}
): ParsedImportRow[] {
  if (fileType === "csv") {
    return parseCsvRows(asText(content));
  }

  if (fileType === "pdf") {
    if (typeof content !== "string") {
      throw new Error("PDF text extraction is not available in the current runtime");
    }

    return parseBankPdfTextRows(content, options.bankPreset);
  }

  return parseWorkbookRows(content);
}

export async function parseImportRowsAsync(
  fileType: ImportFileType,
  content: string | ArrayBuffer,
  options: ParseImportRowsOptions = {}
): Promise<ParsedImportRow[]> {
  if (fileType !== "pdf") {
    return parseImportRows(fileType, content, options);
  }

  const text = typeof content === "string" ? content : await extractPdfText(content, options.onProgress);
  return parseBankPdfTextRows(text, options.bankPreset);
}

export function parseCsvRows(content: string): ParsedImportRow[] {
  const lines = content.split(/\r?\n/);
  const headerIndex = findHeaderLineIndex(lines);
  const tableText = lines.slice(Math.max(0, headerIndex)).join("\n");
  const result = Papa.parse<ParsedImportRow>(tableText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
}

export function parseWorkbookRows(content: string | ArrayBuffer): ParsedImportRow[] {
  const workbook = XLSX.read(content, {
    cellDates: true,
    type: typeof content === "string" ? "binary" : "array"
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: "", header: 1, raw: false });
  const headerIndex = findHeaderRowIndex(rows);

  if (headerIndex < 0) {
    return XLSX.utils.sheet_to_json<ParsedImportRow>(sheet, { defval: "", raw: false });
  }

  const headers = rows[headerIndex].map((value) => String(value ?? "").trim());
  return rows
    .slice(headerIndex + 1)
    .map((row) => rowToObject(headers, row))
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
}

export function parseBankPdfTextRows(text: string, bankPreset?: "abc" | "cmb"): ParsedImportRow[] {
  if (bankPreset === "cmb" || text.includes("招商银行交易流水")) {
    return parseCmbPdfRows(text);
  }

  return parseAbcPdfRows(text);
}

function parseCmbPdfRows(text: string): ParsedImportRow[] {
  const rows: ParsedImportRow[] = [];
  const linePattern = /^(\d{4}-\d{2}-\d{2})\s+CNY\s+([+-]?\d[\d,]*\.\d{2})\s+([+-]?\d[\d,]*\.\d{2})\s+(.+?)\s+(.+)$/;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalizePdfLine(rawLine);
    const match = linePattern.exec(line);
    if (!match) {
      continue;
    }

    rows.push({
      记账日期: match[1],
      货币: "CNY",
      交易金额: match[2],
      联机余额: match[3],
      交易摘要: match[4],
      对手信息: match[5]
    });
  }

  return rows;
}

function parseAbcPdfRows(text: string): ParsedImportRow[] {
  const rows: ParsedImportRow[] = [];
  const linePattern = /^(\d{8})\s+(\d{6})\s+(.+?)\s+([+-]\d[\d,]*\.\d{2})\s+([+-]?\d[\d,]*\.\d{2})\s+(.+)$/;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalizePdfLine(rawLine);
    const match = linePattern.exec(line);
    if (!match) {
      continue;
    }

    const tail = match[6];
    const tailParts = tail.split(/\s+/);
    rows.push({
      交易日期: `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`,
      交易时间: match[2],
      交易摘要: match[3],
      交易金额: match[4],
      本次余额: match[5],
      对手信息: tailParts[0] ?? "",
      日志号: tailParts[1] ?? "",
      交易渠道: tailParts[2] ?? "",
      交易附言: tailParts.slice(3).join(" ") || tail,
      原始附言: tail
    });
  }

  return rows;
}

function asText(content: string | ArrayBuffer): string {
  if (typeof content === "string") {
    return content;
  }

  const decoders = ["utf-8", "gb18030", "gbk"];
  for (const encoding of decoders) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(content);
    } catch {
      // Try the next likely bank/payment export encoding.
    }
  }

  return new TextDecoder("utf-8").decode(content);
}

function findHeaderLineIndex(lines: string[]): number {
  const index = lines.findIndex((line) => isKnownCsvHeaderLine(line) || isHeaderCandidate(line.split(",")));
  return index >= 0 ? index : 0;
}

function findHeaderRowIndex(rows: unknown[][]): number {
  return rows.findIndex((row) => isHeaderCandidate(row.map((value) => String(value ?? ""))));
}

function isHeaderCandidate(values: string[]): boolean {
  const filledValues = values.map(normalizeHeaderValue).filter(Boolean);
  if (filledValues.length < 4) {
    return false;
  }

  const exactScore = [
    "交易时间",
    "交易日期",
    "记账日期",
    "交易金额",
    "金额",
    "收/支",
    "交易对方",
    "交易订单号",
    "交易单号"
  ].filter((keyword) => filledValues.includes(keyword)).length;
  if (exactScore >= 2) {
    return true;
  }

  const text = filledValues.join("|");
  const score = [
    "交易时间",
    "交易日期",
    "记账日期",
    "交易金额",
    "金额",
    "收/支",
    "交易对方",
    "交易订单号",
    "交易单号"
  ].filter((keyword) => text.includes(keyword)).length;

  return score >= 2;
}

function isKnownCsvHeaderLine(line: string): boolean {
  const columns = line.split(",").map(normalizeHeaderValue);
  return (
    columns.includes("交易时间") &&
    columns.includes("交易分类") &&
    columns.includes("商品说明") &&
    columns.includes("收/支") &&
    columns.includes("金额")
  );
}

function normalizeHeaderValue(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

function rowToObject(headers: string[], row: unknown[]): ParsedImportRow {
  return headers.reduce<ParsedImportRow>((result, header, index) => {
    if (header) {
      result[header] = row[index] ?? "";
    }
    return result;
  }, {});
}

function normalizePdfLine(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

async function extractPdfText(
  content: ArrayBuffer,
  onProgress?: (percent: number, label: string) => void
): Promise<string> {
  void content;
  onProgress?.(38, "当前版本暂不开放银行卡 PDF 导入");
  throw new Error("Bank PDF import is disabled for the current Android release");
}
