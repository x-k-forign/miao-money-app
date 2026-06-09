import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  budgetAllocations,
  categories,
  monthlyBudgets,
  type BudgetAllocation,
  type MonthlyBudget,
  type NewBudgetAllocation,
  type NewMonthlyBudget
} from "@/db/schema";
import type { BudgetAllocationDTO, MonthlyBudgetDTO } from "@/types/models";

export async function upsertMonthlyBudget(input: NewMonthlyBudget): Promise<void> {
  await db
    .insert(monthlyBudgets)
    .values(input)
    .onConflictDoUpdate({
      target: monthlyBudgets.month,
      set: {
        expectedIncomeCents: input.expectedIncomeCents,
        savingRate: input.savingRate,
        savingTargetCents: input.savingTargetCents,
        availableBudgetCents: input.availableBudgetCents,
        updatedAt: new Date().toISOString()
      }
    });
}

export async function replaceBudgetAllocations(
  budgetId: string,
  inputs: NewBudgetAllocation[]
): Promise<void> {
  await db.delete(budgetAllocations).where(eq(budgetAllocations.budgetId, budgetId));

  if (inputs.length > 0) {
    await db.insert(budgetAllocations).values(inputs);
  }
}

export async function findMonthlyBudgetByMonth(month: string): Promise<MonthlyBudgetDTO | undefined> {
  const [budget] = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.month, month)).limit(1);
  if (!budget) {
    return undefined;
  }

  const allocations = await db
    .select({
      id: budgetAllocations.id,
      categoryId: budgetAllocations.categoryId,
      categoryName: categories.name,
      dailyBudgetCents: budgetAllocations.dailyBudgetCents,
      monthlyBudgetCents: budgetAllocations.monthlyBudgetCents,
      priority: budgetAllocations.priority,
      spentCents: budgetAllocations.spentCents,
      suggestion: budgetAllocations.suggestion
    })
    .from(budgetAllocations)
    .innerJoin(categories, eq(budgetAllocations.categoryId, categories.id))
    .where(eq(budgetAllocations.budgetId, budget.id));

  return mapMonthlyBudget(budget, allocations);
}

export async function findRawMonthlyBudgetByMonth(month: string): Promise<MonthlyBudget | undefined> {
  const [budget] = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.month, month)).limit(1);
  return budget;
}

export async function listRawBudgetAllocations(budgetId: string): Promise<BudgetAllocation[]> {
  return db.select().from(budgetAllocations).where(eq(budgetAllocations.budgetId, budgetId));
}

function mapMonthlyBudget(
  budget: MonthlyBudget,
  allocations: BudgetAllocationDTO[]
): MonthlyBudgetDTO {
  return {
    allocations,
    availableBudgetCents: budget.availableBudgetCents,
    expectedIncomeCents: budget.expectedIncomeCents,
    id: budget.id,
    month: budget.month,
    savingRate: budget.savingRate == null ? null : budget.savingRate / 10000,
    savingTargetCents: budget.savingTargetCents
  };
}
