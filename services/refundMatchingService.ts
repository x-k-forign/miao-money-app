import type { ImportProvider } from "@/types/models";

export interface RefundMatchRecord {
  amountCents: number;
  externalTradeNo?: string | null;
  merchantName?: string | null;
  merchantOrderNo?: string | null;
  note: string;
  provider?: ImportProvider | null;
  recordDate: string;
}

export function findRefundSourceCandidate<T extends RefundMatchRecord>(
  refund: RefundMatchRecord,
  expenses: T[]
): T | undefined {
  const exactOrder = expenses.find(
    (item) =>
      Boolean(refund.merchantOrderNo && item.merchantOrderNo === refund.merchantOrderNo) ||
      Boolean(refund.externalTradeNo && item.externalTradeNo === refund.externalTradeNo)
  );
  if (exactOrder) {
    return exactOrder;
  }

  if (refund.provider === "alipay" && (refund.merchantOrderNo || refund.externalTradeNo)) {
    return undefined;
  }

  return expenses
    .filter((item) => item.amountCents >= refund.amountCents)
    .map((item) => ({
      item,
      score: getRefundMatchScore(refund, item)
    }))
    .filter((candidate) => candidate.score >= 0.72)
    .sort((a, b) => b.score - a.score)[0]?.item;
}

export function getRefundMatchScore(refund: RefundMatchRecord, expense: RefundMatchRecord): number {
  const merchantScore = textOverlap(refund.merchantName ?? "", expense.merchantName ?? "");
  const noteScore = textOverlap(refund.note, expense.note);
  const dayDistance = Math.abs(
    (Date.parse(refund.recordDate) - Date.parse(expense.recordDate)) / (24 * 60 * 60 * 1000)
  );
  const dateScore = dayDistance <= 3 ? 1 : dayDistance <= 31 ? 0.7 : dayDistance <= 186 ? 0.35 : 0;
  const amountScore =
    refund.amountCents === expense.amountCents ? 1 : refund.amountCents < expense.amountCents ? 0.65 : 0;
  return merchantScore * 0.45 + noteScore * 0.15 + dateScore * 0.2 + amountScore * 0.2;
}

function textOverlap(left: string, right: string): number {
  const a = normalizeMatchText(left);
  const b = normalizeMatchText(right);
  if (!a || !b) {
    return 0;
  }
  if (a === b || a.includes(b) || b.includes(a)) {
    return 1;
  }

  const source = new Set(a.split(""));
  const target = new Set(b.split(""));
  const overlap = Array.from(source).filter((char) => target.has(char)).length;
  return overlap / Math.max(1, Math.min(source.size, target.size));
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[，,。.·:：_\-]/g, "");
}
