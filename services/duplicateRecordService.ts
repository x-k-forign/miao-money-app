import { Platform } from "react-native";
import type { ImportRecordDraftDTO, RecordDTO } from "@/types/models";
import { addDays, getTodayDateString } from "@/utils/date";
import { getMonthlyRecords } from "@/services/recordService";

export interface DuplicateCheckResult {
  duplicateRecordId?: string;
  level: "none" | "possible" | "confirmed";
  reason?: string;
}

export function createImportDedupeHash(draft: ImportRecordDraftDTO): string {
  return simpleHash(
    [
      draft.provider,
      draft.externalTradeNo ?? "",
      draft.recordDate,
      draft.type,
      draft.amountCents,
      normalizeText(draft.merchantName ?? ""),
      normalizeText(draft.note)
    ].join("|")
  );
}

export async function checkImportedRecordDuplicate(
  draft: ImportRecordDraftDTO
): Promise<DuplicateCheckResult> {
  const dedupeHash = draft.dedupeHash ?? createImportDedupeHash(draft);

  if (Platform.OS !== "web") {
    const { findImportRecordByDedupeHash, findImportRecordByTradeNo, findPossibleDuplicateRecords } = await import(
      "@/db/queries/records"
    );

    if (draft.externalTradeNo) {
      const tradeRecord = await findImportRecordByTradeNo(draft.provider, draft.externalTradeNo);
      if (tradeRecord) {
        return {
          duplicateRecordId: tradeRecord.id,
          level: "confirmed",
          reason: "同一来源下交易号已存在"
        };
      }
    }

    const hashRecord = await findImportRecordByDedupeHash(dedupeHash);
    if (hashRecord) {
      return {
        duplicateRecordId: hashRecord.id,
        level: "confirmed",
        reason: "去重 hash 已存在"
      };
    }

    const possible = await findPossibleDuplicateRecords({
      amountCents: draft.amountCents,
      dateCandidates: getDateCandidates(draft.recordDate)
    });
    return resolvePossibleDuplicate(draft, possible);
  }

  const records = await getMonthlyRecords(draft.recordDate.slice(0, 7));
  if (draft.externalTradeNo) {
    const tradeRecord = records.find(
      (record) =>
        record.source === "import" &&
        record.importProvider === draft.provider &&
        record.externalTradeNo === draft.externalTradeNo
    );
    if (tradeRecord) {
      return {
        duplicateRecordId: tradeRecord.id,
        level: "confirmed",
        reason: "同一来源下交易号已存在"
      };
    }
  }

  const hashRecord = records.find((record) => record.source === "import" && record.dedupeHash === dedupeHash);
  if (hashRecord) {
    return {
      duplicateRecordId: hashRecord.id,
      level: "confirmed",
      reason: "去重 hash 已存在"
    };
  }

  return resolvePossibleDuplicate(draft, records);
}

function resolvePossibleDuplicate(
  draft: ImportRecordDraftDTO,
  records: RecordDTO[]
): DuplicateCheckResult {
  const sameDayAmount = records.find(
    (record) =>
      record.recordDate === draft.recordDate &&
      record.amountCents === draft.amountCents &&
      record.type === draft.type &&
      similarText(draft, record)
  );
  if (sameDayAmount) {
    return {
      duplicateRecordId: sameDayAmount.id,
      level: "possible",
      reason: "同日期同金额且商户或备注相似，可能已记录过"
    };
  }

  const nearDayAmount = records.find(
    (record) =>
      record.recordDate !== draft.recordDate &&
      record.amountCents === draft.amountCents &&
      record.type === draft.type &&
      similarText(draft, record)
  );
  if (nearDayAmount) {
    return {
      duplicateRecordId: nearDayAmount.id,
      level: "possible",
      reason: "相近日期同金额且商户或备注相似"
    };
  }

  return {
    level: "none"
  };
}

function similarText(draft: ImportRecordDraftDTO, record: RecordDTO): boolean {
  const sourceText = normalizeText(`${draft.merchantName ?? ""} ${draft.note}`);
  const targetText = normalizeText(`${record.merchantName ?? ""} ${record.note}`);
  if (!sourceText || !targetText) {
    return false;
  }

  return sourceText.includes(targetText) || targetText.includes(sourceText) || overlapRatio(sourceText, targetText) >= 0.45;
}

function getDateCandidates(recordDate: string): string[] {
  const [year, month, day] = recordDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return [addDays(date, -1), date, addDays(date, 1)].map((item) => getTodayDateString(item));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[·,，。._-]/g, "");
}

function overlapRatio(a: string, b: string): number {
  const source = new Set(a.split(""));
  const target = new Set(b.split(""));
  const overlap = Array.from(source).filter((char) => target.has(char)).length;
  return overlap / Math.max(1, Math.min(source.size, target.size));
}

function simpleHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return `h_${(hash >>> 0).toString(16)}`;
}
