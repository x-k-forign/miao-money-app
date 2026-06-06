import { getCategories } from "@/services/categoryService";
import { getMonthlyRecords, getRecordsForMonths } from "@/services/recordService";
import type { CategoryShareDTO, MonthlySummaryDTO, RecordDTO, RecordType, TrendPointDTO } from "@/types/models";
import {
  addDays,
  addMonths,
  formatTrendDateLabel,
  formatTrendMonthLabel,
  getMonthString,
  getTodayDateString
} from "@/utils/date";

export type TrendRange = "7d" | "6m";

export function summarizeRecords(records: RecordDTO[]): MonthlySummaryDTO {
  const incomeCents = records
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + record.amountCents, 0);

  const expenseCents = records
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + record.amountCents, 0);

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents
  };
}

export async function getMonthlySummary(month = getMonthString()): Promise<MonthlySummaryDTO> {
  return summarizeRecords(await getMonthlyRecords(month));
}

export async function getCategoryShare(type: RecordType, month = getMonthString()): Promise<CategoryShareDTO[]> {
  const [records, categories] = await Promise.all([getMonthlyRecords(month), getCategories(type)]);
  const amountByCategory = records
    .filter((record) => record.type === type)
    .reduce<Record<string, number>>((result, record) => {
      result[record.categoryId] = (result[record.categoryId] ?? 0) + record.amountCents;
      return result;
    }, {});

  return categories
    .map((category) => ({
      amountCents: amountByCategory[category.id] ?? 0,
      categoryColor: category.color,
      categoryIcon: category.icon,
      categoryId: category.id,
      categoryName: category.name,
      sortOrder: category.sortOrder
    }))
    .sort((a, b) => b.amountCents - a.amountCents || a.sortOrder - b.sortOrder)
    .map(({ sortOrder, ...item }) => item);
}

export async function getTrend(type: RecordType, range: TrendRange): Promise<TrendPointDTO[]> {
  const today = new Date();

  if (range === "7d") {
    const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
    const months = dates.map((date) => getMonthString(date));
    const records = await getRecordsForMonths(months);
    const bucket = bucketRecords(records, type, "date");

    return dates.map((date) => {
      const key = getTodayDateString(date);
      return {
        label: formatTrendDateLabel(date),
        date: key,
        amountCents: bucket[key] ?? 0
      };
    });
  }

  const months = Array.from({ length: 6 }, (_, index) => addMonths(today, index - 5));
  const monthKeys = months.map((date) => getMonthString(date));
  const records = await getRecordsForMonths(monthKeys);
  const bucket = bucketRecords(records, type, "month");

  return months.map((date) => {
    const key = getMonthString(date);
    return {
      label: formatTrendMonthLabel(date),
      month: key,
      amountCents: bucket[key] ?? 0
    };
  });
}

function bucketRecords(records: RecordDTO[], type: RecordType, mode: "date" | "month"): Record<string, number> {
  return records
    .filter((record) => record.type === type)
    .reduce<Record<string, number>>((result, record) => {
      const key = mode === "date" ? record.recordDate : record.recordDate.slice(0, 7);
      result[key] = (result[key] ?? 0) + record.amountCents;
      return result;
    }, {});
}
