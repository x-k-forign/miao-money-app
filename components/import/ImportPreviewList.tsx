import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { MiaoCard } from "@/components/common/MiaoCard";
import { defaultTheme } from "@/constants/themes";
import type { CategoryDTO, ImportRecordDraftDTO, RecordType } from "@/types/models";
import { centsToYuan } from "@/utils/money";

export interface ImportPreviewItem {
  duplicateReason?: string;
  id: string;
  draft: ImportRecordDraftDTO;
}

interface ImportPreviewListProps {
  categories: CategoryDTO[];
  items: ImportPreviewItem[];
  onChangeType: (id: string, type: RecordType) => void;
  onOpenCategory: (id: string) => void;
  onResolveDuplicate: (id: string) => void;
  onToggleSkip: (id: string) => void;
}

export function ImportPreviewList({
  categories,
  items,
  onChangeType,
  onOpenCategory,
  onResolveDuplicate,
  onToggleSkip
}: ImportPreviewListProps) {
  return (
    <View style={styles.list}>
      {items.map((item) => {
        const category = categories.find((categoryItem) => categoryItem.id === item.draft.categoryId);
        const duplicate = item.draft.status === "duplicate";
        const skipped = item.draft.status === "skipped";
        const lowConfidence = (item.draft.confidence ?? 0) < 0.65;
        const error = item.draft.status === "error";
        const ready = item.draft.status === "ready" && !lowConfidence;

        return (
          <MiaoCard key={item.id} style={[styles.card, duplicate && styles.duplicateCard, error && styles.errorCard]}>
            <View style={styles.topRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.merchant} numberOfLines={1}>
                  {item.draft.merchantName || item.draft.note || "未识别商户"}
                </Text>
                <Text style={styles.dateText}>{item.draft.recordDate}</Text>
              </View>
              <Text style={[styles.amount, item.draft.type === "income" ? styles.income : styles.expense]}>
                {item.draft.type === "income" ? "+" : "-"}¥{centsToYuan(item.draft.amountCents)}
              </Text>
            </View>

            <Text style={styles.note} numberOfLines={2}>{item.draft.note || "无备注"}</Text>

            <View style={styles.typeSegment}>
              {[
                { key: "expense" as const, label: "支出" },
                { key: "income" as const, label: "收入" }
              ].map((option) => {
                const active = item.draft.type === option.key;

                return (
                  <AnimatedPressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onChangeType(item.id, option.key)}
                    style={[styles.typeOption, active && styles.typeOptionActive]}
                  >
                    <Text style={[styles.typeText, active && styles.typeTextActive]}>{option.label}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusPill, (duplicate || error) && styles.duplicatePill, skipped && styles.skippedPill, lowConfidence && styles.warnPill]}>
                {duplicate || error ? (
                  <XCircle color={defaultTheme.pink} size={14} />
                ) : skipped ? (
                  <AlertTriangle color={defaultTheme.muted} size={14} />
                ) : lowConfidence ? (
                  <AlertTriangle color="#D69A00" size={14} />
                ) : (
                  <CheckCircle2 color="#42B992" size={14} />
                )}
                <Text style={styles.statusText}>
                  {duplicate
                    ? item.duplicateReason ?? "疑似重复"
                    : error
                      ? "字段错误"
                      : skipped
                      ? "已跳过"
                      : ready
                        ? "可导入"
                        : lowConfidence
                          ? "分类待确认"
                          : "待处理"}
                </Text>
              </View>
              <AnimatedPressable onPress={() => onOpenCategory(item.id)} style={styles.categoryButton}>
                <Text style={styles.categoryText}>{category?.name ?? "其他"}</Text>
              </AnimatedPressable>
            </View>

            <View style={styles.actionRow}>
              <AnimatedPressable onPress={() => onToggleSkip(item.id)} style={styles.ghostButton}>
                <Text style={styles.ghostText}>{item.draft.status === "skipped" ? "恢复导入" : "跳过"}</Text>
              </AnimatedPressable>
              {duplicate ? (
                <AnimatedPressable onPress={() => onResolveDuplicate(item.id)} style={styles.resolveButton}>
                  <CircleHelp color="#FFFFFF" size={16} />
                  <Text style={styles.resolveText}>不是重复</Text>
                </AnimatedPressable>
              ) : null}
            </View>
          </MiaoCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12
  },
  card: {
    gap: 10
  },
  duplicateCard: {
    borderColor: "#FFD1DF"
  },
  errorCard: {
    opacity: 0.72
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  titleBlock: {
    flex: 1,
    gap: 3
  },
  merchant: {
    color: defaultTheme.text,
    fontSize: 15,
    fontWeight: "900"
  },
  dateText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  amount: {
    fontSize: 16,
    fontWeight: "900"
  },
  income: {
    color: "#42B992"
  },
  expense: {
    color: defaultTheme.pink
  },
  note: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 17
  },
  typeSegment: {
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  typeOption: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 34
  },
  typeOptionActive: {
    backgroundColor: defaultTheme.primary
  },
  typeText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  typeTextActive: {
    color: "#FFFFFF"
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#EDFDF6",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10
  },
  duplicatePill: {
    backgroundColor: "#FFE4EF"
  },
  skippedPill: {
    backgroundColor: "#F2F6FA"
  },
  warnPill: {
    backgroundColor: "#FFF4CF"
  },
  statusText: {
    color: defaultTheme.text,
    flex: 1,
    fontSize: 11,
    fontWeight: "900"
  },
  categoryButton: {
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 10
  },
  categoryText: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end"
  },
  ghostButton: {
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12
  },
  ghostText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  resolveButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12
  },
  resolveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900"
  }
});
