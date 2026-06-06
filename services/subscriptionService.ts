import { Platform } from "react-native";
import { mockSubscriptions } from "@/constants/mockData";
import type { RecordType, SubscriptionDTO } from "@/types/models";
import { getMonthString, getNowISOString } from "@/utils/date";
import { createLocalId } from "@/utils/id";
import {
  deleteSubscriptionGeneratedRecordForMonth,
  detachSubscriptionGeneratedRecords,
  upsertSubscriptionRecordForMonth
} from "@/services/recordService";

export interface SaveSubscriptionInput {
  name: string;
  type: RecordType;
  amountCents: number;
  categoryId: string;
  dayOfMonth: number;
  enabled: boolean;
  note: string;
}

const webSubscriptions: SubscriptionDTO[] = mockSubscriptions.map((subscription, index) => ({
  ...subscription,
  categoryId: findWebCategoryId(subscription.type, subscription.categoryName),
  lastGeneratedMonth: null,
  createdAt: getNowISOString(),
  updatedAt: getNowISOString(),
  id: subscription.id ?? `web-sub-${index}`
}));

export async function addSubscription(input: SaveSubscriptionInput): Promise<string> {
  validateSubscription(input);
  const id = createLocalId("subscription");

  if (Platform.OS === "web") {
    const category = await findCategory(input.categoryId);
    webSubscriptions.unshift({
      id,
      ...input,
      categoryName: category?.name ?? "其他",
      categoryIcon: category?.icon ?? "more",
      categoryColor: category?.color ?? "#72C8F3",
      lastGeneratedMonth: null,
      createdAt: getNowISOString(),
      updatedAt: getNowISOString()
    });
    await syncSubscriptionForCurrentMonth(id);
    return id;
  }

  const { createSubscription } = await import("@/db/queries/subscriptions");
  await createSubscription({
    id,
    ...input,
    lastGeneratedMonth: null
  });
  await syncSubscriptionForCurrentMonth(id);

  return id;
}

export async function updateSubscriptionById(id: string, input: SaveSubscriptionInput): Promise<void> {
  validateSubscription(input);

  if (Platform.OS === "web") {
    const index = webSubscriptions.findIndex((subscription) => subscription.id === id);
    if (index >= 0) {
      const category = await findCategory(input.categoryId);
      webSubscriptions[index] = {
        ...webSubscriptions[index],
        ...input,
        categoryName: category?.name ?? webSubscriptions[index].categoryName,
        categoryIcon: category?.icon ?? webSubscriptions[index].categoryIcon,
        categoryColor: category?.color ?? webSubscriptions[index].categoryColor,
        updatedAt: getNowISOString()
      };
    }
    await syncSubscriptionForCurrentMonth(id);
    return;
  }

  const { updateSubscription } = await import("@/db/queries/subscriptions");
  await updateSubscription(id, input);
  await syncSubscriptionForCurrentMonth(id);
}

export async function deleteSubscriptionById(id: string): Promise<void> {
  await cancelSubscriptionForCurrentMonth(id);
  await detachSubscriptionGeneratedRecords(id);

  if (Platform.OS === "web") {
    const index = webSubscriptions.findIndex((subscription) => subscription.id === id);
    if (index >= 0) {
      webSubscriptions.splice(index, 1);
    }
    return;
  }

  const { deleteSubscription } = await import("@/db/queries/subscriptions");
  await deleteSubscription(id);
}

export async function toggleSubscriptionEnabled(id: string, enabled: boolean): Promise<void> {
  if (Platform.OS === "web") {
    const subscription = webSubscriptions.find((item) => item.id === id);
    if (subscription) {
      subscription.enabled = enabled;
      subscription.updatedAt = getNowISOString();
    }
    await syncSubscriptionForCurrentMonth(id);
    return;
  }

  const { updateSubscription } = await import("@/db/queries/subscriptions");
  await updateSubscription(id, { enabled });
  await syncSubscriptionForCurrentMonth(id);
}

export async function getSubscriptions(): Promise<SubscriptionDTO[]> {
  if (Platform.OS === "web") {
    return sortSubscriptions(webSubscriptions);
  }

  const { listSubscriptionDTOs } = await import("@/db/queries/subscriptions");
  return listSubscriptionDTOs();
}

export async function getSubscriptionById(id: string): Promise<SubscriptionDTO | undefined> {
  if (Platform.OS === "web") {
    return webSubscriptions.find((subscription) => subscription.id === id);
  }

  const { findSubscriptionDTOById } = await import("@/db/queries/subscriptions");
  return findSubscriptionDTOById(id);
}

export async function generateDueSubscriptionRecords(month = getMonthString()): Promise<void> {
  const today = new Date();
  const currentMonth = getMonthString(today);
  const targetMonth = month;
  const currentDay = targetMonth === currentMonth ? today.getDate() : 28;
  const subscriptions = await getSubscriptions();

  for (const subscription of subscriptions) {
    await syncSubscriptionToMonth(subscription, targetMonth, currentDay);
  }
}

export async function syncSubscriptionForCurrentMonth(id: string): Promise<void> {
  const subscription = await getSubscriptionById(id);
  if (!subscription) {
    return;
  }

  const today = new Date();
  await syncSubscriptionToMonth(subscription, getMonthString(today), today.getDate());
}

async function cancelSubscriptionForCurrentMonth(id: string): Promise<void> {
  const month = getMonthString();
  await deleteSubscriptionGeneratedRecordForMonth(id, month);
  await markGenerated(id, null);
}

async function syncSubscriptionToMonth(
  subscription: SubscriptionDTO,
  month: string,
  currentDay: number
): Promise<void> {
  if (!subscription.enabled || subscription.dayOfMonth > currentDay) {
    await deleteSubscriptionGeneratedRecordForMonth(subscription.id, month);
    if (subscription.lastGeneratedMonth === month) {
      await markGenerated(subscription.id, null);
    }
    return;
  }

  const recordDate = `${month}-${subscription.dayOfMonth.toString().padStart(2, "0")}`;
  await upsertSubscriptionRecordForMonth(
    {
      type: subscription.type,
      amountCents: subscription.amountCents,
      categoryId: subscription.categoryId,
      note: subscription.note || subscription.name,
      recordDate,
      subscriptionId: subscription.id
    },
    month
  );

  await markGenerated(subscription.id, month);
}

async function markGenerated(id: string, month: string | null): Promise<void> {
  if (Platform.OS === "web") {
    const subscription = webSubscriptions.find((item) => item.id === id);
    if (subscription) {
      subscription.lastGeneratedMonth = month;
      subscription.updatedAt = getNowISOString();
    }
    return;
  }

  const { updateSubscription } = await import("@/db/queries/subscriptions");
  await updateSubscription(id, { lastGeneratedMonth: month });
}

function validateSubscription(input: SaveSubscriptionInput): void {
  if (!input.name.trim()) {
    throw new Error("Subscription name is required");
  }

  if (input.amountCents <= 0) {
    throw new Error("Subscription amount must be greater than zero");
  }

  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    throw new Error("Subscription dayOfMonth must be between 1 and 28");
  }
}

async function findCategory(categoryId: string) {
  const { getCategories } = await import("@/services/categoryService");
  const categories = await getCategories();
  return categories.find((category) => category.id === categoryId);
}

function findWebCategoryId(type: RecordType, categoryName: string): string {
  if (type === "income") {
    if (categoryName === "工资") {
      return "salary";
    }
    return "other-income";
  }

  const expenseMap: Record<string, string> = {
    住房: "housing",
    娱乐: "entertainment"
  };

  return expenseMap[categoryName] ?? "other";
}

function sortSubscriptions(subscriptions: SubscriptionDTO[]): SubscriptionDTO[] {
  return [...subscriptions].sort((a, b) => {
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1;
    }

    return a.dayOfMonth - b.dayOfMonth;
  });
}
