import { getCategories } from "@/services/categoryService";
import { getMonthlyRecords, getRecordById, getRecordsForMonths } from "@/services/recordService";
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
    .filter((record) => record.type === "income" && !isRefundRecord(record))
    .reduce((sum, record) => sum + record.amountCents, 0);

  const grossExpenseCents = records
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + record.amountCents, 0);
  const refundCents = records
    .filter(isMatchedRefundRecord)
    .reduce((sum, record) => sum + record.amountCents, 0);
  const expenseCents = Math.max(0, grossExpenseCents - refundCents);

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents + refundCents - grossExpenseCents
  };
}

export async function getMonthlySummary(month = getMonthString()): Promise<MonthlySummaryDTO> {
  return summarizeRecords(await getMonthlyRecords(month));
}

export async function getCategoryShare(type: RecordType, month = getMonthString()): Promise<CategoryShareDTO[]> {
  const [records, categories] = await Promise.all([getMonthlyRecords(month), getCategories(type)]);
  const amountByCategory = records
    .filter((record) => record.type === type && !isRefundRecord(record))
    .reduce<Record<string, number>>((result, record) => {
      result[record.categoryId] = (result[record.categoryId] ?? 0) + record.amountCents;
      return result;
    }, {});

  if (type === "expense") {
    const refunds = records.filter((record) => isRefundRecord(record) && record.relatedRecordId);
    const sources = await Promise.all(refunds.map((refund) => getRecordById(refund.relatedRecordId as string)));
    refunds.forEach((refund, index) => {
      const source = sources[index];
      if (source) {
        amountByCategory[source.categoryId] = Math.max(
          0,
          (amountByCategory[source.categoryId] ?? 0) - refund.amountCents
        );
      }
    });
  }

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
  const bucket = records
    .filter((record) => record.type === type && !isRefundRecord(record))
    .reduce<Record<string, number>>((result, record) => {
      const key = mode === "date" ? record.recordDate : record.recordDate.slice(0, 7);
      result[key] = (result[key] ?? 0) + record.amountCents;
      return result;
    }, {});

  if (type === "expense") {
    records.filter(isMatchedRefundRecord).forEach((record) => {
      const key = mode === "date" ? record.recordDate : record.recordDate.slice(0, 7);
      bucket[key] = Math.max(0, (bucket[key] ?? 0) - record.amountCents);
    });
  }

  return bucket;
}

export function isRefundRecord(record: RecordDTO): boolean {
  return record.transactionKind === "refund" || (record.source === "import" && record.categoryName === "退款");
}

function isMatchedRefundRecord(record: RecordDTO): boolean {
  return isRefundRecord(record) && Boolean(record.relatedRecordId);
}
