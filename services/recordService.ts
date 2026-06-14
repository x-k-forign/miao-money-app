import { Platform } from "react-native";
import { mockRecords } from "@/constants/mockData";
import type { NewRecordRow } from "@/db/schema";
import type {
  ImportProvider,
  ImportRecordDraftDTO,
  ImportTransactionKind,
  RecordDTO,
  RecordSource,
  RecordType
} from "@/types/models";
import { getNowISOString, getRecordMonth } from "@/utils/date";
import { createLocalId } from "@/utils/id";
import { findRefundSourceCandidate } from "@/services/refundMatchingService";

export interface SaveRecordInput {
  type: RecordType;
  amountCents: number;
  categoryId: string;
  note: string;
  recordDate: string;
}

export interface SaveImportRecordInput extends SaveRecordInput {
  dedupeHash?: string;
  externalTradeNo?: string;
  id?: string;
  importBatchId: string;
  importProvider: ImportProvider;
  merchantOrderNo?: string;
  merchantName?: string;
  relatedRecordId?: string;
  transactionKind: ImportTransactionKind;
}

const webRecords: RecordDTO[] = mockRecords.map((record) => ({
  ...record,
  note: record.note ?? "",
  createdAt: getNowISOString(),
  updatedAt: getNowISOString()
}));

export async function addManualRecord(input: SaveRecordInput): Promise<string> {
  return createRecordWithSource(input, "manual");
}

export async function createSubscriptionRecord(
  input: SaveRecordInput & { subscriptionId: string }
): Promise<string> {
  return createRecordWithSource(input, "subscription", input.subscriptionId);
}

export async function createImportedRecord(input: SaveImportRecordInput): Promise<string> {
  return createRecordWithSource(input, "import", undefined, input);
}

export async function createImportedRecords(inputs: SaveImportRecordInput[]): Promise<string[]> {
  if (inputs.length === 0) {
    return [];
  }

  if (Platform.OS === "web") {
    for (const input of inputs) {
      await createImportedRecord(input);
    }
    return inputs.map((input) => input.id ?? "");
  }

  await ensureNativeDatabaseReady();
  const { createRecords, listExistingRecordIds } = await import("@/db/queries/records");
  const recordRows = inputs.map((input) => ({
    id: input.id ?? createLocalId("record"),
    type: input.type,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    note: input.note,
    recordDate: input.recordDate,
    recordMonth: getRecordMonth(input.recordDate),
    source: "import" as const,
    subscriptionId: null,
    importBatchId: input.importBatchId,
    importProvider: input.importProvider,
    externalTradeNo: input.externalTradeNo ?? null,
    merchantOrderNo: input.merchantOrderNo ?? null,
    merchantName: input.merchantName ?? null,
    dedupeHash: input.dedupeHash ?? null,
    transactionKind: input.transactionKind,
    relatedRecordId: input.relatedRecordId ?? null
  }));
  await createRecords(
    recordRows
  );

  return listExistingRecordIds(recordRows.map((row) => row.id));
}

export async function upsertSubscriptionRecordForMonth(
  input: SaveRecordInput & { subscriptionId: string },
  month: string
): Promise<void> {
  if (Platform.OS === "web") {
    const existingIndex = webRecords.findIndex(
      (record) =>
        record.source === "subscription" &&
        record.subscriptionId === input.subscriptionId &&
        record.recordDate.startsWith(month)
    );
    const category = await findWebCategory(input.categoryId);

    if (existingIndex >= 0) {
      webRecords[existingIndex] = {
        ...webRecords[existingIndex],
        ...input,
        categoryName: category?.name ?? webRecords[existingIndex].categoryName,
        categoryIcon: category?.icon ?? webRecords[existingIndex].categoryIcon,
        categoryColor: category?.color ?? webRecords[existingIndex].categoryColor,
        source: "subscription",
        updatedAt: getNowISOString()
      };
      return;
    }

    await createSubscriptionRecord(input);
    return;
  }

  await ensureNativeDatabaseReady();
  const { upsertSubscriptionRecord } = await import("@/db/queries/records");
  await upsertSubscriptionRecord({
    id: createLocalId("record"),
    type: input.type,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    note: input.note,
    recordDate: input.recordDate,
    recordMonth: month,
    source: "subscription",
    subscriptionId: input.subscriptionId
  });
}

export async function deleteSubscriptionGeneratedRecordForMonth(
  subscriptionId: string,
  month: string
): Promise<void> {
  if (Platform.OS === "web") {
    const index = webRecords.findIndex(
      (record) =>
        record.source === "subscription" &&
        record.subscriptionId === subscriptionId &&
        record.recordDate.startsWith(month)
    );
    if (index >= 0) {
      webRecords.splice(index, 1);
    }
    return;
  }

  await ensureNativeDatabaseReady();
  const { deleteSubscriptionRecordForMonth } = await import("@/db/queries/records");
  await deleteSubscriptionRecordForMonth(subscriptionId, month);
}

export async function detachSubscriptionGeneratedRecords(subscriptionId: string): Promise<void> {
  if (Platform.OS === "web") {
    webRecords.forEach((record) => {
      if (record.source === "subscription" && record.subscriptionId === subscriptionId) {
        record.subscriptionId = null;
        record.updatedAt = getNowISOString();
      }
    });
    return;
  }

  await ensureNativeDatabaseReady();
  const { detachSubscriptionRecords } = await import("@/db/queries/records");
  await detachSubscriptionRecords(subscriptionId);
}

export async function updateManualRecord(id: string, input: SaveRecordInput): Promise<void> {
  if (Platform.OS === "web") {
    const index = webRecords.findIndex((record) => record.id === id);
    if (index >= 0) {
      const category = await findWebCategory(input.categoryId);
      webRecords[index] = {
        ...webRecords[index],
        ...input,
        categoryName: category?.name ?? webRecords[index].categoryName,
        categoryIcon: category?.icon ?? webRecords[index].categoryIcon,
        categoryColor: category?.color ?? webRecords[index].categoryColor,
        updatedAt: getNowISOString()
      };
    }
    return;
  }

  await ensureNativeDatabaseReady();
  const { updateRecord } = await import("@/db/queries/records");
  await updateRecord(id, toRecordRow(input));
}

export async function deleteRecordById(id: string): Promise<void> {
  if (Platform.OS === "web") {
    const index = webRecords.findIndex((record) => record.id === id);
    if (index >= 0) {
      webRecords.splice(index, 1);
    }
    return;
  }

  await ensureNativeDatabaseReady();
  const { deleteRecord } = await import("@/db/queries/records");
  await deleteRecord(id);
}

export async function deleteAllRecordRows(): Promise<void> {
  if (Platform.OS === "web") {
    webRecords.splice(0, webRecords.length);
    return;
  }

  await ensureNativeDatabaseReady();
  const { deleteAllRecords } = await import("@/db/queries/records");
  await deleteAllRecords();
}

export async function getMonthlyRecords(month: string): Promise<RecordDTO[]> {
  if (Platform.OS === "web") {
    return sortRecords(webRecords.filter((record) => record.recordDate.startsWith(month)));
  }

  await ensureNativeDatabaseReady();
  const { listRecordDTOsByMonth } = await import("@/db/queries/records");
  return listRecordDTOsByMonth(month);
}

export async function getRecordsByDate(date: string): Promise<RecordDTO[]> {
  if (Platform.OS === "web") {
    return sortRecords(webRecords.filter((record) => record.recordDate === date));
  }

  await ensureNativeDatabaseReady();
  const { listRecordDTOsByDate } = await import("@/db/queries/records");
  return listRecordDTOsByDate(date);
}

export async function getRecordById(id: string): Promise<RecordDTO | undefined> {
  if (Platform.OS === "web") {
    return webRecords.find((record) => record.id === id);
  }

  await ensureNativeDatabaseReady();
  const { findRecordDTOById } = await import("@/db/queries/records");
  return findRecordDTOById(id);
}

export async function getRecordsForMonths(months: string[]): Promise<RecordDTO[]> {
  const uniqueMonths = Array.from(new Set(months));
  const batches = await Promise.all(uniqueMonths.map((month) => getMonthlyRecords(month)));
  return sortRecords(batches.flat());
}

export async function findRefundSourceRecord(draft: ImportRecordDraftDTO): Promise<RecordDTO | undefined> {
  const months = getPreviousMonths(draft.recordDate, 7);
  const records = (await getRecordsForMonths(months)).filter(
    (record) =>
      record.type === "expense" &&
      (record.transactionKind ?? record.type) === "expense" &&
      record.importProvider === draft.provider
  );

  return findRefundSourceCandidate(draft, records);
}

async function createRecordWithSource(
  input: SaveRecordInput,
  source: RecordSource,
  subscriptionId?: string,
  importInput?: SaveImportRecordInput
): Promise<string> {
  const id = importInput?.id ?? createLocalId("record");

  if (Platform.OS === "web") {
    const category = await findWebCategory(input.categoryId);
    webRecords.unshift({
      id,
      ...input,
      categoryName: category?.name ?? "其他",
      categoryIcon: category?.icon ?? "more",
      categoryColor: category?.color ?? "#72C8F3",
      source,
      subscriptionId: subscriptionId ?? null,
      importBatchId: importInput?.importBatchId ?? null,
      importProvider: importInput?.importProvider ?? null,
      externalTradeNo: importInput?.externalTradeNo ?? null,
      merchantOrderNo: importInput?.merchantOrderNo ?? null,
      merchantName: importInput?.merchantName ?? null,
      dedupeHash: importInput?.dedupeHash ?? null,
      transactionKind: importInput?.transactionKind ?? input.type,
      relatedRecordId: importInput?.relatedRecordId ?? null,
      createdAt: getNowISOString(),
      updatedAt: getNowISOString()
    });
    return id;
  }

  await ensureNativeDatabaseReady();
  const { createRecord } = await import("@/db/queries/records");
  await createRecord({
    id,
    type: input.type,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    note: input.note,
    recordDate: input.recordDate,
    recordMonth: getRecordMonth(input.recordDate),
    source,
    subscriptionId: subscriptionId ?? null,
    importBatchId: importInput?.importBatchId ?? null,
    importProvider: importInput?.importProvider ?? null,
    externalTradeNo: importInput?.externalTradeNo ?? null,
    merchantOrderNo: importInput?.merchantOrderNo ?? null,
    merchantName: importInput?.merchantName ?? null,
    dedupeHash: importInput?.dedupeHash ?? null,
    transactionKind: importInput?.transactionKind ?? input.type,
    relatedRecordId: importInput?.relatedRecordId ?? null
  });

  return id;
}

function toRecordRow(input: SaveRecordInput): Partial<NewRecordRow> {
  return {
    type: input.type,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    note: input.note,
    recordDate: input.recordDate,
    recordMonth: getRecordMonth(input.recordDate)
  };
}

async function findWebCategory(categoryId: string) {
  const { getCategories } = await import("@/services/categoryService");
  const categories = await getCategories();
  return categories.find((category) => category.id === categoryId);
}

function sortRecords(records: RecordDTO[]): RecordDTO[] {
  return [...records].sort((a, b) => {
    if (a.recordDate !== b.recordDate) {
      return b.recordDate.localeCompare(a.recordDate);
    }

    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

function getPreviousMonths(recordDate: string, count: number): string[] {
  const [year, month] = recordDate.slice(0, 7).split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - 1 - index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

async function ensureNativeDatabaseReady(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const { initializeDatabase } = await import("@/db/init");
  await initializeDatabase();
}
