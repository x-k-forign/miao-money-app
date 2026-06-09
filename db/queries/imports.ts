import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  importBatches,
  importRows,
  type ImportBatch,
  type ImportRow,
  type NewImportBatch,
  type NewImportRow
} from "@/db/schema";

export async function createImportBatch(input: NewImportBatch): Promise<void> {
  await db.insert(importBatches).values(input);
}

export async function updateImportBatch(id: string, input: Partial<NewImportBatch>): Promise<void> {
  await db
    .update(importBatches)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(importBatches.id, id));
}

export async function findImportBatchById(id: string): Promise<ImportBatch | undefined> {
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
  return batch;
}

export async function createImportRows(inputs: NewImportRow[]): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  await db.insert(importRows).values(inputs);
}

export async function updateImportRow(id: string, input: Partial<NewImportRow>): Promise<void> {
  await db
    .update(importRows)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(importRows.id, id));
}

export async function updateImportRows(ids: string[], input: Partial<NewImportRow>): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await db
    .update(importRows)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(inArray(importRows.id, ids));
}

export async function listImportRowsByBatch(batchId: string): Promise<ImportRow[]> {
  return db.select().from(importRows).where(eq(importRows.batchId, batchId));
}
