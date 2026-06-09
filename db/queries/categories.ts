import { and, eq, inArray } from "drizzle-orm";
import { activeDefaultCategoryIds } from "@/constants/categories";
import { db } from "@/db/client";
import { categories, type Category } from "@/db/schema";
import type { CategoryKind } from "@/types/models";

export async function listCategories(kind?: CategoryKind): Promise<Category[]> {
  const baseQuery = db.select().from(categories).where(inArray(categories.id, activeDefaultCategoryIds));

  if (!kind) {
    return baseQuery.orderBy(categories.kind, categories.sortOrder);
  }

  return db
    .select()
    .from(categories)
    .where(and(inArray(categories.id, activeDefaultCategoryIds), eq(categories.kind, kind)))
    .orderBy(categories.sortOrder);
}

export async function findCategoryById(id: string): Promise<Category | undefined> {
  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return category;
}
