import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, type Category } from "@/db/schema";
import type { CategoryKind } from "@/types/models";

export async function listCategories(kind?: CategoryKind): Promise<Category[]> {
  const baseQuery = db.select().from(categories);

  if (!kind) {
    return baseQuery.orderBy(categories.kind, categories.sortOrder);
  }

  return baseQuery.where(eq(categories.kind, kind)).orderBy(categories.sortOrder);
}

export async function findCategoryById(id: string): Promise<Category | undefined> {
  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return category;
}
