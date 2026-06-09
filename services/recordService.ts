import { Platform } from "react-native";
import { mockRecords } from "@/constants/mockData";
import type { NewRecordRow } from "@/db/schema";
import type { ImportProvider, RecordDTO, RecordSource, RecordType } from "@/types/models";
import { getNowISOString, getRecordMonth } from "@/utils/date";
import { createLocalId } from "@/utils/id";

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
  importBatchId: string;
  importProvider: ImportProvider;
  merchantName?: string;
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

export async function createImportedRecords(inputs: SaveImportRecordInput[]): Promise<number> {
  if (inputs.length === 0) {
    return 0;
  }

  if (Platform.OS === "web") {
    for (const input of inputs) {
      await createImportedRecord(input);
    }
    return inputs.length;
  }

  const { createRecords } = await import("@/db/queries/records");
  await createRecords(
    inputs.map((input) => ({
      id: createLocalId("record"),
      type: input.type,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      note: input.note,
      recordDate: input.recordDate,
      recordMonth: getRecordMonth(input.recordDate),
      source: "import",
      subscriptionId: null,
      importBatchId: input.importBatchId,
      importProvider: input.importProvider,
      externalTradeNo: input.externalTradeNo ?? null,
      merchantName: input.merchantName ?? null,
      dedupeHash: input.dedupeHash ?? null
    }))
  );

  return inputs.length;
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

  const { deleteRecord } = await import("@/db/queries/records");
  await deleteRecord(id);
}

export async function deleteAllRecordRows(): Promise<void> {
  if (Platform.OS === "web") {
    webRecords.splice(0, webRecords.length);
    return;
  }

  const { deleteAllRecords } = await import("@/db/queries/records");
  await deleteAllRecords();
}

export async function getMonthlyRecords(month: string): Promise<RecordDTO[]> {
  if (Platform.OS === "web") {
    return sortRecords(webRecords.filter((record) => record.recordDate.startsWith(month)));
  }

  const { listRecordDTOsByMonth } = await import("@/db/queries/records");
  return listRecordDTOsByMonth(month);
}

export async function getRecordsByDate(date: string): Promise<RecordDTO[]> {
  if (Platform.OS === "web") {
    return sortRecords(webRecords.filter((record) => record.recordDate === date));
  }

  const { listRecordDTOsByDate } = await import("@/db/queries/records");
  return listRecordDTOsByDate(date);
}

export async function getRecordById(id: string): Promise<RecordDTO | undefined> {
  if (Platform.OS === "web") {
    return webRecords.find((record) => record.id === id);
  }

  const { findRecordDTOById } = await import("@/db/queries/records");
  return findRecordDTOById(id);
}

export async function getRecordsForMonths(months: string[]): Promise<RecordDTO[]> {
  const uniqueMonths = Array.from(new Set(months));
  const batches = await Promise.all(uniqueMonths.map((month) => getMonthlyRecords(month)));
  return sortRecords(batches.flat());
}

async function createRecordWithSource(
  input: SaveRecordInput,
  source: RecordSource,
  subscriptionId?: string,
  importInput?: SaveImportRecordInput
): Promise<string> {
  const id = createLocalId("record");

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
      merchantName: importInput?.merchantName ?? null,
      dedupeHash: importInput?.dedupeHash ?? null,
      createdAt: getNowISOString(),
      updatedAt: getNowISOString()
    });
    return id;
  }

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
    merchantName: importInput?.merchantName ?? null,
    dedupeHash: importInput?.dedupeHash ?? null
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
