import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, records, type NewRecordRow, type RecordRow } from "@/db/schema";
import type { RecordDTO } from "@/types/models";

export async function createRecord(input: NewRecordRow): Promise<void> {
  await db.insert(records).values(input);
}

export async function createRecords(inputs: NewRecordRow[]): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  await db.insert(records).values(inputs).onConflictDoNothing();
}

export async function upsertSubscriptionRecord(input: NewRecordRow): Promise<void> {
  await db
    .insert(records)
    .values(input)
    .onConflictDoUpdate({
      target: [records.subscriptionId, records.recordMonth, records.source],
      targetWhere: sql`${records.source} = 'subscription' AND ${records.subscriptionId} IS NOT NULL`,
      set: {
        type: input.type,
        amountCents: input.amountCents,
        categoryId: input.categoryId,
        note: input.note,
        recordDate: input.recordDate,
        recordMonth: input.recordMonth,
        source: "subscription",
        subscriptionId: input.subscriptionId,
        updatedAt: new Date().toISOString()
      }
    });
}

export async function updateRecord(id: string, input: Partial<NewRecordRow>): Promise<void> {
  await db
    .update(records)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(records.id, id));
}

export async function deleteRecord(id: string): Promise<void> {
  await db.delete(records).where(eq(records.id, id));
}

export async function deleteAllRecords(): Promise<void> {
  await db.delete(records);
}

export async function deleteSubscriptionRecordForMonth(subscriptionId: string, month: string): Promise<void> {
  await db
    .delete(records)
    .where(
      and(
        eq(records.subscriptionId, subscriptionId),
        eq(records.recordMonth, month),
        eq(records.source, "subscription")
      )
    );
}

export async function detachSubscriptionRecords(subscriptionId: string): Promise<void> {
  await db
    .update(records)
    .set({ subscriptionId: null, updatedAt: new Date().toISOString() })
    .where(eq(records.subscriptionId, subscriptionId));
}

export async function listRecordsByMonth(month: string): Promise<RecordRow[]> {
  return db
    .select()
    .from(records)
    .where(eq(records.recordMonth, month))
    .orderBy(desc(records.recordDate), desc(records.createdAt));
}

export async function listRecordsByDate(date: string): Promise<RecordRow[]> {
  return db
    .select()
    .from(records)
    .where(eq(records.recordDate, date))
    .orderBy(desc(records.recordDate), desc(records.createdAt));
}

export async function listRecordDTOsByMonth(month: string): Promise<RecordDTO[]> {
  return mapRecordRows(
    await db
      .select({
        id: records.id,
        type: records.type,
        amountCents: records.amountCents,
        categoryId: records.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        note: records.note,
        recordDate: records.recordDate,
        source: records.source,
        subscriptionId: records.subscriptionId,
        importBatchId: records.importBatchId,
        importProvider: records.importProvider,
        externalTradeNo: records.externalTradeNo,
        merchantName: records.merchantName,
        dedupeHash: records.dedupeHash,
        createdAt: records.createdAt,
        updatedAt: records.updatedAt
      })
      .from(records)
      .innerJoin(categories, eq(records.categoryId, categories.id))
      .where(eq(records.recordMonth, month))
      .orderBy(desc(records.recordDate), desc(records.createdAt))
  );
}

export async function listRecordDTOsByDate(date: string): Promise<RecordDTO[]> {
  return mapRecordRows(
    await db
      .select({
        id: records.id,
        type: records.type,
        amountCents: records.amountCents,
        categoryId: records.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        note: records.note,
        recordDate: records.recordDate,
        source: records.source,
        subscriptionId: records.subscriptionId,
        importBatchId: records.importBatchId,
        importProvider: records.importProvider,
        externalTradeNo: records.externalTradeNo,
        merchantName: records.merchantName,
        dedupeHash: records.dedupeHash,
        createdAt: records.createdAt,
        updatedAt: records.updatedAt
      })
      .from(records)
      .innerJoin(categories, eq(records.categoryId, categories.id))
      .where(eq(records.recordDate, date))
      .orderBy(desc(records.recordDate), desc(records.createdAt))
  );
}

export async function findRecordDTOById(id: string): Promise<RecordDTO | undefined> {
  const [record] = mapRecordRows(
    await db
      .select({
        id: records.id,
        type: records.type,
        amountCents: records.amountCents,
        categoryId: records.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        note: records.note,
        recordDate: records.recordDate,
        source: records.source,
        subscriptionId: records.subscriptionId,
        importBatchId: records.importBatchId,
        importProvider: records.importProvider,
        externalTradeNo: records.externalTradeNo,
        merchantName: records.merchantName,
        dedupeHash: records.dedupeHash,
        createdAt: records.createdAt,
        updatedAt: records.updatedAt
      })
      .from(records)
      .innerJoin(categories, eq(records.categoryId, categories.id))
      .where(eq(records.id, id))
      .limit(1)
  );

  return record;
}

export async function findSubscriptionRecord(subscriptionId: string, month: string): Promise<RecordRow | undefined> {
  const [record] = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.subscriptionId, subscriptionId),
        eq(records.recordMonth, month),
        eq(records.source, "subscription")
      )
    )
    .limit(1);

  return record;
}

export async function findImportRecordByTradeNo(
  provider: NonNullable<RecordRow["importProvider"]>,
  externalTradeNo: string
): Promise<RecordRow | undefined> {
  const [record] = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.source, "import"),
        eq(records.importProvider, provider),
        eq(records.externalTradeNo, externalTradeNo)
      )
    )
    .limit(1);

  return record;
}

export async function findImportRecordByDedupeHash(dedupeHash: string): Promise<RecordRow | undefined> {
  const [record] = await db
    .select()
    .from(records)
    .where(and(eq(records.source, "import"), eq(records.dedupeHash, dedupeHash)))
    .limit(1);

  return record;
}

export async function findPossibleDuplicateRecords(input: {
  amountCents: number;
  dateCandidates: string[];
}): Promise<RecordDTO[]> {
  if (input.dateCandidates.length === 0) {
    return [];
  }

  return mapRecordRows(
    await db
      .select({
        id: records.id,
        type: records.type,
        amountCents: records.amountCents,
        categoryId: records.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        note: records.note,
        recordDate: records.recordDate,
        source: records.source,
        subscriptionId: records.subscriptionId,
        importBatchId: records.importBatchId,
        importProvider: records.importProvider,
        externalTradeNo: records.externalTradeNo,
        merchantName: records.merchantName,
        dedupeHash: records.dedupeHash,
        createdAt: records.createdAt,
        updatedAt: records.updatedAt
      })
      .from(records)
      .innerJoin(categories, eq(records.categoryId, categories.id))
      .where(
        and(
          eq(records.amountCents, input.amountCents),
          or(...input.dateCandidates.map((date) => eq(records.recordDate, date)))
        )
      )
      .orderBy(desc(records.recordDate), desc(records.createdAt))
  );
}

function mapRecordRows(
  rows: Array<{
    id: string;
    type: RecordDTO["type"];
    amountCents: number;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    note: string | null;
    recordDate: string;
    source: RecordDTO["source"];
    subscriptionId: string | null;
    importBatchId: string | null;
    importProvider: RecordDTO["importProvider"];
    externalTradeNo: string | null;
    merchantName: string | null;
    dedupeHash: string | null;
    createdAt: string;
    updatedAt: string;
  }>
): RecordDTO[] {
  return rows.map((record) => ({
    ...record,
    note: record.note ?? ""
  }));
}
