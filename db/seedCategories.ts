import { defaultCategories } from "@/constants/categories";
import { categories } from "@/db/schema";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export async function seedDefaultCategories(): Promise<void> {
  const now = new Date().toISOString();

  await db
    .insert(categories)
    .values(defaultCategories.map((category) => ({ ...category, updatedAt: now })))
    .onConflictDoUpdate({
      target: categories.id,
      set: {
        color: sql`excluded.color`,
        icon: sql`excluded.icon`,
        isSystem: true,
        kind: sql`excluded.kind`,
        name: sql`excluded.name`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: now
      }
    });
}
