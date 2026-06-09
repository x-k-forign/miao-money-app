import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, subscriptions, type NewSubscription, type Subscription } from "@/db/schema";
import type { SubscriptionDTO } from "@/types/models";

export async function createSubscription(input: NewSubscription): Promise<void> {
  await db.insert(subscriptions).values(input);
}

export async function updateSubscription(id: string, input: Partial<NewSubscription>): Promise<void> {
  await db
    .update(subscriptions)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(subscriptions.id, id));
}

export async function deleteSubscription(id: string): Promise<void> {
  await db.delete(subscriptions).where(eq(subscriptions.id, id));
}

export async function listSubscriptions(): Promise<Subscription[]> {
  return db.select().from(subscriptions).orderBy(subscriptions.dayOfMonth, desc(subscriptions.createdAt));
}

export async function listSubscriptionDTOs(): Promise<SubscriptionDTO[]> {
  return mapSubscriptionRows(
    await db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        type: subscriptions.type,
        amountCents: subscriptions.amountCents,
        categoryId: subscriptions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        dayOfMonth: subscriptions.dayOfMonth,
        enabled: subscriptions.enabled,
        note: subscriptions.note,
        lastGeneratedMonth: subscriptions.lastGeneratedMonth,
        reminderEnabled: subscriptions.reminderEnabled,
        reminderDaysBefore: subscriptions.reminderDaysBefore,
        reminderTime: subscriptions.reminderTime,
        lastRemindedMonth: subscriptions.lastRemindedMonth,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt
      })
      .from(subscriptions)
      .innerJoin(categories, eq(subscriptions.categoryId, categories.id))
      .orderBy(subscriptions.dayOfMonth, desc(subscriptions.createdAt))
  );
}

export async function findSubscriptionDTOById(id: string): Promise<SubscriptionDTO | undefined> {
  const [subscription] = mapSubscriptionRows(
    await db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        type: subscriptions.type,
        amountCents: subscriptions.amountCents,
        categoryId: subscriptions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        dayOfMonth: subscriptions.dayOfMonth,
        enabled: subscriptions.enabled,
        note: subscriptions.note,
        lastGeneratedMonth: subscriptions.lastGeneratedMonth,
        reminderEnabled: subscriptions.reminderEnabled,
        reminderDaysBefore: subscriptions.reminderDaysBefore,
        reminderTime: subscriptions.reminderTime,
        lastRemindedMonth: subscriptions.lastRemindedMonth,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt
      })
      .from(subscriptions)
      .innerJoin(categories, eq(subscriptions.categoryId, categories.id))
      .where(eq(subscriptions.id, id))
      .limit(1)
  );

  return subscription;
}

function mapSubscriptionRows(
  rows: Array<{
    id: string;
    name: string;
    type: SubscriptionDTO["type"];
    amountCents: number;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    dayOfMonth: number;
    enabled: boolean;
    note: string | null;
    lastGeneratedMonth: string | null;
    reminderEnabled: boolean;
    reminderDaysBefore: number | null;
    reminderTime: string | null;
    lastRemindedMonth: string | null;
    createdAt: string;
    updatedAt: string;
  }>
): SubscriptionDTO[] {
  return rows.map((subscription) => ({
    ...subscription,
    note: subscription.note ?? ""
  }));
}
