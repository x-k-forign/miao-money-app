import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { classificationRules, type ClassificationRule, type NewClassificationRule } from "@/db/schema";

export async function upsertClassificationRule(input: NewClassificationRule): Promise<void> {
  await db
    .insert(classificationRules)
    .values(input)
    .onConflictDoUpdate({
      target: [classificationRules.keyword, classificationRules.categoryId, classificationRules.source],
      set: {
        matchType: input.matchType,
        priority: input.priority,
        updatedAt: new Date().toISOString()
      }
    });
}

export async function listClassificationRules(): Promise<ClassificationRule[]> {
  return db
    .select()
    .from(classificationRules)
    .orderBy(desc(classificationRules.source), desc(classificationRules.priority), desc(classificationRules.hitCount));
}

export async function markClassificationRuleHit(id: string): Promise<void> {
  const rule = await findClassificationRuleById(id);
  if (!rule) {
    return;
  }

  await db
    .update(classificationRules)
    .set({
      hitCount: rule.hitCount + 1,
      lastHitAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .where(eq(classificationRules.id, id));
}

export async function findClassificationRuleById(id: string): Promise<ClassificationRule | undefined> {
  const [rule] = await db.select().from(classificationRules).where(eq(classificationRules.id, id)).limit(1);
  return rule;
}

export async function findClassificationRuleByKeyword(input: {
  categoryId: string;
  keyword: string;
  source: ClassificationRule["source"];
}): Promise<ClassificationRule | undefined> {
  const [rule] = await db
    .select()
    .from(classificationRules)
    .where(
      and(
        eq(classificationRules.categoryId, input.categoryId),
        eq(classificationRules.keyword, input.keyword),
        eq(classificationRules.source, input.source)
      )
    )
    .limit(1);

  return rule;
}
