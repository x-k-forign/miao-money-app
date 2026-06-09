import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import type { ImportBatchDTO, ImportFileSelectionDTO, ImportFileType, ImportProvider, ImportRecordDraftDTO } from "@/types/models";
import { createImportDedupeHash, checkImportedRecordDuplicate } from "@/services/duplicateRecordService";
import { createImportedRecord, createImportedRecords, type SaveImportRecordInput } from "@/services/recordService";
import { getCategories } from "@/services/categoryService";
import { getNowISOString } from "@/utils/date";
import { createLocalId } from "@/utils/id";

const IMPORT_MIME_TYPES: Record<ImportProvider, string[]> = {
  alipay: ["text/csv", "application/csv", ".csv"],
  bank: ["application/pdf", ".pdf"],
  wechat: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"]
};

export async function pickImportFile(provider: ImportProvider): Promise<ImportFileSelectionDTO | null> {
  const result = await DocumentPicker.getDocumentAsync({
    base64: false,
    copyToCacheDirectory: true,
    multiple: false,
    type: IMPORT_MIME_TYPES[provider]
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  return {
    file: asset.file,
    fileType: inferImportFileType(asset.name, asset.mimeType),
    mimeType: asset.mimeType,
    name: asset.name,
    size: asset.size,
    uri: asset.uri
  };
}

export function inferImportFileType(name: string, mimeType?: string): ImportFileType {
  const normalizedName = name.toLowerCase();
  const normalizedMimeType = mimeType?.toLowerCase() ?? "";

  if (normalizedName.endsWith(".xlsx") || normalizedMimeType.includes("spreadsheetml")) {
    return "xlsx";
  }

  if (normalizedName.endsWith(".xls") || normalizedMimeType.includes("vnd.ms-excel")) {
    return "xls";
  }

  if (normalizedName.endsWith(".pdf") || normalizedMimeType.includes("pdf")) {
    return "pdf";
  }

  return "csv";
}

export async function readImportFileBuffer(file: ImportFileSelectionDTO): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    if (file.file) {
      return file.file.arrayBuffer();
    }

    const response = await fetch(file.uri);
    return response.arrayBuffer();
  }

  const { File } = await import("expo-file-system");
  const localFile = new File(file.uri);

  return localFile.arrayBuffer();
}

export interface ConfirmImportBatchInput {
  drafts: ImportRecordDraftDTO[];
  file: ImportFileSelectionDTO;
  provider: ImportProvider;
  providerDetail?: string | null;
}

export async function confirmImportBatch(input: ConfirmImportBatchInput): Promise<ImportBatchDTO> {
  assertImportFileMatchesProvider(input.provider, input.file.fileType);

  const batchId = createLocalId("import_batch");
  const [expenseCategories, incomeCategories] = await Promise.all([getCategories("expense"), getCategories("income")]);
  const normalizedDrafts = input.drafts.map((draft) =>
    normalizeImportDraft(draft, draft.type === "income" ? incomeCategories : expenseCategories)
  );
  const importableDrafts = normalizedDrafts.filter((draft) => draft.status === "ready");
  let importedRows = 0;
  let duplicateRows = normalizedDrafts.filter((draft) => draft.status === "duplicate").length;

  if (Platform.OS !== "web") {
    const { createImportBatch, createImportRows, updateImportBatch, updateImportRow, updateImportRows } = await import("@/db/queries/imports");

    await createImportBatch({
      id: batchId,
      provider: input.provider,
      providerDetail: input.providerDetail ?? null,
      fileName: input.file.name,
      fileType: input.file.fileType,
      totalRows: normalizedDrafts.length,
      readyRows: importableDrafts.length,
      errorRows: normalizedDrafts.filter((draft) => draft.status === "error").length,
      duplicateRows,
      importedRows: 0
    });

    const rowIds = new Map<ImportRecordDraftDTO, string>();
    await createImportRows(
      normalizedDrafts.map((draft) => {
        const id = createLocalId("import_row");
        rowIds.set(draft, id);
        return toImportRow(id, batchId, draft);
      })
    );

    const recordInputs: SaveImportRecordInput[] = [];
    const importedRowIds: string[] = [];

    for (const draft of importableDrafts) {
      const duplicate = await checkImportedRecordDuplicate(draft);
      const rowId = rowIds.get(draft);

      if (duplicate.level === "confirmed") {
        duplicateRows += 1;
        if (rowId) {
          await updateImportRow(rowId, {
            status: "duplicate",
            duplicateRecordId: duplicate.duplicateRecordId,
            errorMessage: duplicate.reason
          });
        }
        continue;
      }

      recordInputs.push({
        amountCents: draft.amountCents,
        categoryId: draft.categoryId as string,
        dedupeHash: draft.dedupeHash,
        externalTradeNo: draft.externalTradeNo,
        importBatchId: batchId,
        importProvider: draft.provider,
        merchantName: draft.merchantName,
        note: draft.note,
        recordDate: draft.recordDate,
        type: draft.type
      });

      if (rowId) {
        importedRowIds.push(rowId);
      }
    }

    importedRows = await createImportedRecords(recordInputs);
    await updateImportRows(importedRowIds, { status: "imported" });

    await updateImportBatch(batchId, {
      duplicateRows,
      importedRows,
      readyRows: Math.max(0, importableDrafts.length - importedRows)
    });
  } else {
    for (const draft of importableDrafts) {
      const duplicate = await checkImportedRecordDuplicate(draft);
      if (duplicate.level === "confirmed") {
        duplicateRows += 1;
        continue;
      }

      await createImportedRecord({
        amountCents: draft.amountCents,
        categoryId: draft.categoryId as string,
        dedupeHash: draft.dedupeHash,
        externalTradeNo: draft.externalTradeNo,
        importBatchId: batchId,
        importProvider: draft.provider,
        merchantName: draft.merchantName,
        note: draft.note,
        recordDate: draft.recordDate,
        type: draft.type
      });
      importedRows += 1;
    }
  }

  return {
    duplicateRows,
    errorRows: normalizedDrafts.filter((draft) => draft.status === "error").length,
    fileName: input.file.name,
    fileType: input.file.fileType,
    id: batchId,
    importedRows,
    provider: input.provider,
    providerDetail: input.providerDetail ?? null,
    readyRows: Math.max(0, importableDrafts.length - importedRows),
    totalRows: normalizedDrafts.length
  };
}

export function assertImportFileMatchesProvider(provider: ImportProvider, fileType: ImportFileType): void {
  const allowed: Record<ImportProvider, ImportFileType[]> = {
    alipay: ["csv"],
    bank: ["pdf"],
    wechat: ["xlsx"]
  };

  if (!allowed[provider].includes(fileType)) {
    throw new Error(getImportFileMismatchMessage(provider));
  }
}

export function getImportFileMismatchMessage(provider: ImportProvider): string {
  const label: Record<ImportProvider, string> = {
    alipay: "支付宝账单请导入 CSV 文件。",
    bank: "银行卡流水请导入 PDF 文件。",
    wechat: "微信支付账单请导入 XLSX 文件。"
  };

  return label[provider];
}

function normalizeImportDraft(
  draft: ImportRecordDraftDTO,
  categories: Awaited<ReturnType<typeof getCategories>>
): ImportRecordDraftDTO {
  const fallbackCategoryId = categories.find((item) => item.name.includes("其他"))?.id ?? categories[0]?.id;

  return {
    ...draft,
    categoryId: draft.categoryId ?? fallbackCategoryId,
    dedupeHash: draft.dedupeHash ?? createImportDedupeHash(draft)
  };
}

function toImportRow(id: string, batchId: string, draft: ImportRecordDraftDTO) {
  return {
    id,
    batchId,
    rawJson: JSON.stringify(draft.raw),
    status: draft.status,
    type: draft.type,
    amountCents: draft.amountCents,
    recordDate: draft.recordDate,
    merchantName: draft.merchantName ?? null,
    externalTradeNo: draft.externalTradeNo ?? null,
    note: draft.note,
    categoryId: draft.categoryId ?? null,
    confidence: Math.round((draft.confidence ?? 0) * 100),
    duplicateRecordId: draft.duplicateRecordId ?? null,
    dedupeHash: draft.dedupeHash ?? createImportDedupeHash(draft),
    errorMessage: draft.status === "error" ? "字段缺失或金额/日期无法识别" : null,
    createdAt: getNowISOString(),
    updatedAt: getNowISOString()
  };
}
