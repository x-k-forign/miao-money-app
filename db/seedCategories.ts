import { defaultCategories } from "@/constants/categories";
import { categories } from "@/db/schema";
import { db } from "@/db/client";

export async function seedDefaultCategories(): Promise<void> {
  await db
    .insert(categories)
    .values(defaultCategories)
    .onConflictDoNothing();
}
