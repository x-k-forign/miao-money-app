import type { BudgetAllocationDTO, MonthlyBudgetDTO } from "@/types/models";
import { Platform } from "react-native";
import { getCategories } from "@/services/categoryService";
import { getMonthlyRecords, getRecordById } from "@/services/recordService";
import { getSubscriptions } from "@/services/subscriptionService";
import { createLocalId } from "@/utils/id";

export interface GenerateBudgetInput {
  expectedIncomeCents: number;
  month: string;
  savingRate?: number | null;
  savingTargetCents?: number | null;
}

export type IncomeBudgetTier = "poor" | "comfortable" | "wealthy";

export interface IncomeBudgetTierProfile {
  description: string;
  habitBlend: number;
  label: string;
  tier: IncomeBudgetTier;
}

export async function generateMonthlyBudgetPlan(
  input: GenerateBudgetInput
): Promise<MonthlyBudgetDTO> {
  const [categories, subscriptions, previousRecords, currentRecords] = await Promise.all([
    getCategories("expense"),
    getSubscriptions(),
    getMonthlyRecords(getPreviousMonth(input.month)),
    getMonthlyRecords(input.month)
  ]);
  const incomeTier = getIncomeBudgetTierProfile(input.expectedIncomeCents);
  const savingTarget = resolveSavingTarget(input.expectedIncomeCents, input.savingRate, input.savingTargetCents);
  const availableBudgetCents = Math.max(0, input.expectedIncomeCents - savingTarget);
  const fixedByCategory = new Map<string, number>();

  subscriptions
    .filter((item) => item.enabled && item.type === "expense")
    .forEach((item) => {
      fixedByCategory.set(item.categoryId, (fixedByCategory.get(item.categoryId) ?? 0) + item.amountCents);
    });

  const previousExpenseByCategory = new Map<string, number>();
  previousRecords
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      previousExpenseByCategory.set(item.categoryId, (previousExpenseByCategory.get(item.categoryId) ?? 0) + item.amountCents);
    });
  await applyRefundsToCategoryTotals(previousRecords, previousExpenseByCategory);

  const currentSpentByCategory = new Map<string, number>();
  currentRecords
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      currentSpentByCategory.set(item.categoryId, (currentSpentByCategory.get(item.categoryId) ?? 0) + item.amountCents);
    });
  await applyRefundsToCategoryTotals(currentRecords, currentSpentByCategory);

  const fixedTotal = Array.from(fixedByCategory.values()).reduce((sum, value) => sum + value, 0);
  const flexiblePool = Math.max(0, availableBudgetCents - fixedTotal);
  const variableCategories = categories.filter((category) => !fixedByCategory.has(category.id));
  const previousVariableTotal = variableCategories.reduce((sum, category) => sum + (previousExpenseByCategory.get(category.id) ?? 0), 0);
  const plannedWeights = buildIncomeTierWeights(variableCategories, previousExpenseByCategory, previousVariableTotal, incomeTier);
  const days = getRemainingDaysInMonth(input.month);

  const allocations: BudgetAllocationDTO[] = categories
    .map((category) => {
      const fixedBudget = fixedByCategory.get(category.id) ?? 0;
      const previousSpend = previousExpenseByCategory.get(category.id) ?? 0;
      const enabled = fixedBudget > 0 || isCategoryEnabledByTier(category.name, incomeTier.tier, previousSpend);
      const priority = fixedBudget > 0 ? "fixed" : getBudgetPriority(category.name, previousSpend, previousVariableTotal, incomeTier.tier);
      const weight = plannedWeights.get(category.id) ?? 0;
      const monthlyBudgetCents = fixedBudget > 0 ? fixedBudget : isOtherCategory(category.name) || !enabled ? 0 : Math.round(flexiblePool * weight);
      const spentCents = currentSpentByCategory.get(category.id) ?? 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        dailyBudgetCents: Math.round(monthlyBudgetCents / days),
        enabled,
        monthlyBudgetCents,
        priority,
        spentCents,
        suggestion: getBudgetSuggestion(category.name, priority, monthlyBudgetCents, spentCents, incomeTier)
      };
    })
    .sort(compareBudgetAllocations);

  return {
    allocations,
    availableBudgetCents,
    expectedIncomeCents: input.expectedIncomeCents,
    id: `budget-draft-${input.month}`,
    month: input.month,
    savingRate: input.savingRate ?? null,
    savingTargetCents: input.savingTargetCents ?? null
  };
}

const webBudgets = new Map<string, MonthlyBudgetDTO>();

export async function saveMonthlyBudgetPlan(plan: MonthlyBudgetDTO): Promise<void> {
  if (Platform.OS === "web") {
    webBudgets.set(plan.month, plan);
    return;
  }

  await ensureNativeDatabaseReady();
  const { findRawMonthlyBudgetByMonth, upsertMonthlyBudget, replaceBudgetAllocations } = await import("@/db/queries/budgets");
  const existingBudget = await findRawMonthlyBudgetByMonth(plan.month);
  const budgetId = existingBudget?.id ?? (plan.id.startsWith("budget-draft-") ? createLocalId("budget") : plan.id);

  await upsertMonthlyBudget({
    id: budgetId,
    month: plan.month,
    expectedIncomeCents: plan.expectedIncomeCents,
    savingRate: plan.savingRate == null ? null : Math.round(plan.savingRate * 10000),
    savingTargetCents: plan.savingTargetCents ?? null,
    availableBudgetCents: plan.availableBudgetCents
  });
  await replaceBudgetAllocations(
    budgetId,
    plan.allocations.map((allocation) => ({
      id: allocation.id ?? createLocalId("budget_allocation"),
      budgetId,
      categoryId: allocation.categoryId,
      priority: allocation.priority,
      monthlyBudgetCents: allocation.monthlyBudgetCents,
      dailyBudgetCents: allocation.dailyBudgetCents,
      spentCents: allocation.spentCents,
      suggestion: allocation.suggestion
    }))
  );
}

export async function getSavedMonthlyBudget(month: string): Promise<MonthlyBudgetDTO | undefined> {
  if (Platform.OS === "web") {
    return webBudgets.get(month);
  }

  await ensureNativeDatabaseReady();
  const { findMonthlyBudgetByMonth } = await import("@/db/queries/budgets");
  return findMonthlyBudgetByMonth(month);
}

export async function refreshBudgetSpent(plan: MonthlyBudgetDTO): Promise<MonthlyBudgetDTO> {
  const currentSpentByCategory = await getCurrentSpentByCategory(plan.month);
  const incomeTier = getIncomeBudgetTierProfile(plan.expectedIncomeCents);

  return {
    ...plan,
    allocations: plan.allocations.map((allocation) => {
      const spentCents = currentSpentByCategory.get(allocation.categoryId) ?? 0;

      return {
        ...allocation,
        spentCents,
        suggestion: getBudgetSuggestion(
          allocation.categoryName,
          allocation.priority,
          allocation.monthlyBudgetCents,
          spentCents,
          incomeTier
        )
      };
    })
  };
}

export function mergeSavedBudgetWithGenerated(
  generatedBudget: MonthlyBudgetDTO,
  savedBudget: MonthlyBudgetDTO
): MonthlyBudgetDTO {
  const savedByCategoryId = new Map(savedBudget.allocations.map((allocation) => [allocation.categoryId, allocation]));

  return {
    ...generatedBudget,
    availableBudgetCents: savedBudget.availableBudgetCents,
    expectedIncomeCents: savedBudget.expectedIncomeCents,
    id: savedBudget.id,
    month: savedBudget.month,
    savingRate: savedBudget.savingRate ?? null,
    savingTargetCents: savedBudget.savingTargetCents ?? null,
    allocations: generatedBudget.allocations.map((allocation) => {
      const savedAllocation = savedByCategoryId.get(allocation.categoryId);
      if (!savedAllocation) {
        return allocation;
      }

      return {
        ...allocation,
        dailyBudgetCents: savedAllocation.dailyBudgetCents,
        enabled: true,
        id: savedAllocation.id,
        monthlyBudgetCents: savedAllocation.monthlyBudgetCents,
        priority: savedAllocation.priority,
        suggestion: savedAllocation.suggestion || allocation.suggestion
      };
    })
  };
}

export function optimizeCustomBudgetPlan(plan: MonthlyBudgetDTO): MonthlyBudgetDTO {
  const incomeTier = getIncomeBudgetTierProfile(plan.expectedIncomeCents);
  const days = getRemainingDaysInMonth(plan.month);
  const targetTotal = Math.max(0, plan.availableBudgetCents);
  const activeAllocations = plan.allocations.filter((allocation) => allocation.enabled !== false);
  const rawSystemWeights = activeAllocations.map((allocation) => ({
    categoryId: allocation.categoryId,
    weight: capDiscretionaryWeight(
      allocation.categoryName,
      incomeTier.tier,
      getIncomeTierCategoryWeight(allocation.categoryName, incomeTier.tier)
    )
  }));
  const systemWeightTotal = rawSystemWeights.reduce((sum, item) => sum + item.weight, 0);
  const systemWeightByCategory = new Map(
    rawSystemWeights.map((item) => [
      item.categoryId,
      systemWeightTotal > 0 ? item.weight / systemWeightTotal : 1 / Math.max(1, activeAllocations.length)
    ])
  );
  const customTotal = activeAllocations.reduce((sum, item) => sum + Math.max(0, item.monthlyBudgetCents), 0);
  const customWeightByCategory = new Map(
    activeAllocations.map((item) => [
      item.categoryId,
      customTotal > 0 ? Math.max(0, item.monthlyBudgetCents) / customTotal : (systemWeightByCategory.get(item.categoryId) ?? 0)
    ])
  );

  const optimizedAllocations = activeAllocations.map((allocation) => {
    const systemBudget = targetTotal * (systemWeightByCategory.get(allocation.categoryId) ?? 0);
    const customBudget = targetTotal * (customWeightByCategory.get(allocation.categoryId) ?? 0);
    const customBlend = incomeTier.tier === "poor" ? 0.25 : incomeTier.tier === "comfortable" ? 0.35 : 0.45;
    const blendedBudget = systemBudget * (1 - customBlend) + customBudget * customBlend;
    const minimumBudget = isCoreLivingCategory(allocation.categoryName)
      ? systemBudget * (incomeTier.tier === "poor" ? 0.92 : 0.82)
      : 0;

    return {
      ...allocation,
      enabled: true,
      monthlyBudgetCents: Math.max(0, Math.round(Math.max(blendedBudget, minimumBudget))),
      suggestion: getOptimizedBudgetSuggestion(allocation.categoryName, allocation.priority, incomeTier)
    };
  });
  const normalizedAllocations = normalizeAllocationTotal(optimizedAllocations, targetTotal);
  const optimizedByCategory = new Map(normalizedAllocations.map((allocation) => [allocation.categoryId, allocation]));

  return {
    ...plan,
    allocations: plan.allocations.map((allocation) => {
      const optimized = optimizedByCategory.get(allocation.categoryId);
      if (!optimized) {
        return allocation;
      }

      return {
        ...optimized,
        dailyBudgetCents: Math.round(optimized.monthlyBudgetCents / days)
      };
    })
  };
}

export function getIncomeBudgetTierProfile(expectedIncomeCents: number): IncomeBudgetTierProfile {
  if (expectedIncomeCents < 600000) {
    return {
      description: "优先保住衣食住行、通勤、通讯、水电和医疗缓冲，娱乐与高消费只保留小额弹性。",
      habitBlend: 0.15,
      label: "贫困档",
      tier: "poor"
    };
  }

  if (expectedIncomeCents < 2000000) {
    return {
      description: "基础生活稳定后，给娱乐、学习、社交和偶尔高消费留出空间，同时控制冲动购物。",
      habitBlend: 0.25,
      label: "小康档",
      tier: "comfortable"
    };
  }

  return {
    description: "生活质量预算更高，允许更频繁的旅行、数码、社交和品质消费，同时保留储蓄空间。",
    habitBlend: 0.35,
    label: "富裕档",
    tier: "wealthy"
  };
}

function resolveSavingTarget(expectedIncomeCents: number, savingRate?: number | null, savingTargetCents?: number | null): number {
  if (savingTargetCents && savingTargetCents > 0) {
    return Math.min(expectedIncomeCents, savingTargetCents);
  }

  if (savingRate && savingRate > 0) {
    return Math.round(expectedIncomeCents * savingRate);
  }

  return 0;
}

function getPreviousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${new Date(year, monthNumber - 2, 1).getFullYear()}-${(new Date(year, monthNumber - 2, 1).getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function getRemainingDaysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  const today = new Date();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNumber;

  return Math.max(1, daysInMonth - (isCurrentMonth ? today.getDate() : 0) + 1);
}

async function getCurrentSpentByCategory(month: string): Promise<Map<string, number>> {
  const currentRecords = await getMonthlyRecords(month);
  const currentSpentByCategory = new Map<string, number>();

  currentRecords
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      currentSpentByCategory.set(item.categoryId, (currentSpentByCategory.get(item.categoryId) ?? 0) + item.amountCents);
    });
  await applyRefundsToCategoryTotals(currentRecords, currentSpentByCategory);

  return currentSpentByCategory;
}

async function applyRefundsToCategoryTotals(
  records: Awaited<ReturnType<typeof getMonthlyRecords>>,
  totals: Map<string, number>
): Promise<void> {
  const refunds = records.filter(
    (record) =>
      (record.transactionKind === "refund" || (record.source === "import" && record.categoryName === "退款")) &&
      record.relatedRecordId
  );
  const sources = await Promise.all(refunds.map((refund) => getRecordById(refund.relatedRecordId as string)));
  refunds.forEach((refund, index) => {
    const source = sources[index];
    if (source) {
      totals.set(source.categoryId, Math.max(0, (totals.get(source.categoryId) ?? 0) - refund.amountCents));
    }
  });
}

function buildIncomeTierWeights(
  categories: Awaited<ReturnType<typeof getCategories>>,
  previousExpenseByCategory: Map<string, number>,
  previousVariableTotal: number,
  incomeTier: IncomeBudgetTierProfile
): Map<string, number> {
  const rawWeights = categories.map((category) => {
    const previousSpend = previousExpenseByCategory.get(category.id) ?? 0;
    if (isOtherCategory(category.name)) {
      return {
        categoryId: category.id,
        weight: 0
      };
    }

    if (!isCategoryEnabledByTier(category.name, incomeTier.tier, previousSpend)) {
      return {
        categoryId: category.id,
        weight: 0
      };
    }

    const baseWeight = getIncomeTierCategoryWeight(category.name, incomeTier.tier);
    const previousWeight = previousVariableTotal > 0 ? previousSpend / previousVariableTotal : 0;
    const blendedWeight =
      previousVariableTotal > 0
        ? baseWeight * (1 - incomeTier.habitBlend) + previousWeight * incomeTier.habitBlend
        : baseWeight;

    return {
      categoryId: category.id,
      weight: capDiscretionaryWeight(category.name, incomeTier.tier, blendedWeight)
    };
  });
  const totalWeight = rawWeights.reduce((sum, item) => sum + item.weight, 0);
  const fallbackCategories = categories.filter((category) => !isOtherCategory(category.name));
  const fallbackWeight = fallbackCategories.length > 0 ? 1 / fallbackCategories.length : 0;

  return new Map(
    rawWeights.map((item) => [
      item.categoryId,
      totalWeight > 0 ? item.weight / totalWeight : item.weight > 0 || fallbackCategories.some((category) => category.id === item.categoryId) ? fallbackWeight : 0
    ])
  );
}

function getBudgetPriority(
  categoryName: string,
  previousSpend: number,
  previousTotal: number,
  incomeTier: IncomeBudgetTier
): BudgetAllocationDTO["priority"] {
  if (["餐饮", "居家", "通讯订阅", "医疗", "学习办公", "家庭宠物", "金融"].includes(categoryName)) {
    return "essential";
  }

  if (["交通", "汽车"].includes(categoryName)) {
    return "transport";
  }

  if (["购物", "娱乐", "旅行", "社交"].includes(categoryName)) {
    const highSpendThreshold = incomeTier === "poor" ? 0.12 : incomeTier === "comfortable" ? 0.22 : 0.32;
    return previousTotal > 0 && previousSpend / previousTotal > highSpendThreshold ? "high_spend" : "flexible";
  }

  return "other";
}

function getIncomeTierCategoryWeight(categoryName: string, incomeTier: IncomeBudgetTier): number {
  const poorWeights: Record<string, number> = {
    居家: 30,
    餐饮: 34,
    交通: 12,
    购物: 7,
    医疗: 5,
    通讯订阅: 5,
    家庭宠物: 4,
    学习办公: 2,
    娱乐: 1,
    金融: 6,
    生活服务: 2,
    汽车: 1.5,
    公益: 0.5,
    其他: 2
  };
  const comfortableWeights: Record<string, number> = {
    居家: 25,
    餐饮: 25,
    交通: 9,
    购物: 11,
    医疗: 4,
    通讯订阅: 5,
    家庭宠物: 7,
    学习办公: 6,
    娱乐: 4,
    社交: 4,
    旅行: 3,
    金融: 7,
    汽车: 4,
    生活服务: 5,
    公益: 1,
    其他: 3
  };
  const wealthyWeights: Record<string, number> = {
    居家: 24,
    餐饮: 24,
    交通: 7,
    汽车: 6,
    购物: 15,
    医疗: 5,
    通讯订阅: 6,
    家庭宠物: 9,
    学习办公: 7,
    娱乐: 5,
    社交: 6,
    旅行: 8,
    金融: 8,
    生活服务: 7,
    公益: 2,
    其他: 4
  };
  const weights =
    incomeTier === "poor" ? poorWeights : incomeTier === "comfortable" ? comfortableWeights : wealthyWeights;

  return weights[categoryName] ?? getDefaultCategoryWeight(categoryName, incomeTier);
}

function getDefaultCategoryWeight(categoryName: string, incomeTier: IncomeBudgetTier): number {
  if (["社交", "生活服务", "公益", "汽车"].includes(categoryName)) {
    return incomeTier === "poor" ? 1 : incomeTier === "comfortable" ? 2 : 3;
  }

  if (["娱乐", "金融"].includes(categoryName)) {
    return incomeTier === "poor" ? 0.8 : incomeTier === "comfortable" ? 2 : 3;
  }

  return incomeTier === "poor" ? 0.4 : incomeTier === "comfortable" ? 1.2 : 2;
}

function isCategoryEnabledByTier(categoryName: string, incomeTier: IncomeBudgetTier, previousSpend: number): boolean {
  if (previousSpend > 0) {
    return true;
  }

  if (["餐饮", "居家", "交通", "通讯订阅", "购物", "医疗", "金融", "其他"].includes(categoryName)) {
    return true;
  }

  if (incomeTier === "poor") {
    return ["家庭宠物", "学习办公", "生活服务"].includes(categoryName);
  }

  if (incomeTier === "comfortable") {
    return ["家庭宠物", "学习办公", "购物", "娱乐", "社交", "旅行", "汽车", "生活服务", "公益"].includes(categoryName);
  }

  return true;
}

function isCoreLivingCategory(categoryName: string): boolean {
  return ["餐饮", "居家", "交通", "通讯订阅", "医疗", "金融"].includes(categoryName);
}

function isOtherCategory(categoryName: string): boolean {
  return categoryName === "其他";
}

function compareBudgetAllocations(a: BudgetAllocationDTO, b: BudgetAllocationDTO): number {
  const orderDelta = getBudgetCategoryOrder(a.categoryName) - getBudgetCategoryOrder(b.categoryName);
  if (orderDelta !== 0) {
    return orderDelta;
  }

  return priorityOrder(a.priority) - priorityOrder(b.priority) || b.monthlyBudgetCents - a.monthlyBudgetCents;
}

function getBudgetCategoryOrder(categoryName: string): number {
  const order = [
    "餐饮",
    "居家",
    "交通",
    "汽车",
    "购物",
    "医疗",
    "通讯订阅",
    "学习办公",
    "家庭宠物",
    "金融",
    "娱乐",
    "社交",
    "旅行",
    "生活服务",
    "公益",
    "其他"
  ];
  const index = order.indexOf(categoryName);

  return index >= 0 ? index : order.length - 1;
}

function normalizeAllocationTotal(allocations: BudgetAllocationDTO[], targetTotal: number): BudgetAllocationDTO[] {
  const total = allocations.reduce((sum, item) => sum + item.monthlyBudgetCents, 0);
  if (allocations.length === 0 || total === targetTotal) {
    return allocations;
  }

  let remainingDelta = targetTotal - total;
  const orderedAllocations = [...allocations].sort((a, b) => {
    const aOrder = isCoreLivingCategory(a.categoryName) ? 1 : 0;
    const bOrder = isCoreLivingCategory(b.categoryName) ? 1 : 0;
    return bOrder - aOrder || b.monthlyBudgetCents - a.monthlyBudgetCents;
  });
  const resultByCategory = new Map(allocations.map((allocation) => [allocation.categoryId, { ...allocation }]));

  for (const allocation of orderedAllocations) {
    if (remainingDelta === 0) {
      break;
    }

    const current = resultByCategory.get(allocation.categoryId);
    if (!current) {
      continue;
    }

    if (remainingDelta > 0) {
      current.monthlyBudgetCents += remainingDelta;
      remainingDelta = 0;
      break;
    }

    if (isCoreLivingCategory(current.categoryName)) {
      continue;
    }

    const removable = Math.min(current.monthlyBudgetCents, Math.abs(remainingDelta));
    current.monthlyBudgetCents -= removable;
    remainingDelta += removable;
  }

  if (remainingDelta < 0) {
    for (const allocation of orderedAllocations) {
      if (remainingDelta === 0) {
        break;
      }

      const current = resultByCategory.get(allocation.categoryId);
      if (!current) {
        continue;
      }

      const removable = Math.min(current.monthlyBudgetCents, Math.abs(remainingDelta));
      current.monthlyBudgetCents -= removable;
      remainingDelta += removable;
    }
  }

  return allocations.map((allocation) => resultByCategory.get(allocation.categoryId) ?? allocation);
}

function capDiscretionaryWeight(categoryName: string, incomeTier: IncomeBudgetTier, weight: number): number {
  if (incomeTier !== "poor") {
    return weight;
  }

  if (["旅行", "娱乐", "社交"].includes(categoryName)) {
    return Math.min(weight, 1.8);
  }

  if (["购物", "家庭宠物"].includes(categoryName)) {
    return Math.min(weight, 3.2);
  }

  return weight;
}

function getBudgetSuggestion(
  categoryName: string,
  priority: BudgetAllocationDTO["priority"],
  monthlyBudgetCents: number,
  spentCents: number,
  incomeTier: IncomeBudgetTierProfile
): string {
  if (spentCents > monthlyBudgetCents && monthlyBudgetCents > 0) {
    return `${categoryName} 已超过本月预算，后续支出建议暂停或换低价方案。`;
  }

  if (priority === "high_spend") {
    return incomeTier.tier === "wealthy"
      ? `${categoryName} 上月占比较高，本月保留品质消费空间，但建议设置单次上限。`
      : `${categoryName} 上月占比较高，本月建议先压缩 10%-15%。`;
  }

  if (priority === "fixed") {
    return "固定支出已按订阅和周期费用优先预留。";
  }

  if (priority === "essential") {
    return incomeTier.tier === "poor"
      ? "基础生活优先保障，尽量选择稳定低波动方案。"
      : "必需消费已按收入档位预留，月底前保持稳定即可。";
  }

  if (priority === "flexible" && incomeTier.tier === "poor") {
    return "当前收入档位下仅保留小额弹性预算，建议先满足衣食住行。";
  }

  if (priority === "flexible" && incomeTier.tier === "wealthy") {
    return "富裕档允许更高品质消费，仍建议保留单项预算边界。";
  }

  return "预算可手动调整，保存后作为本月参考方案。";
}

function getOptimizedBudgetSuggestion(
  categoryName: string,
  priority: BudgetAllocationDTO["priority"],
  incomeTier: IncomeBudgetTierProfile
): string {
  if (isCoreLivingCategory(categoryName)) {
    return "已按自定义方案智能校准，优先保障衣食住行和必要支出。";
  }

  if (priority === "high_spend" || priority === "flexible") {
    return incomeTier.tier === "poor"
      ? "自定义优化后仅保留小额弹性预算，先满足基础生活。"
      : "自定义优化后在基础生活之外保留弹性消费空间。";
  }

  return "已按当前分类开关和收入档位重新平衡。";
}

function priorityOrder(priority: BudgetAllocationDTO["priority"]): number {
  const order: Record<BudgetAllocationDTO["priority"], number> = {
    fixed: 0,
    essential: 1,
    transport: 2,
    flexible: 3,
    high_spend: 4,
    other: 5
  };

  return order[priority];
}

async function ensureNativeDatabaseReady(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const { initializeDatabase } = await import("@/db/init");
  await initializeDatabase();
}
