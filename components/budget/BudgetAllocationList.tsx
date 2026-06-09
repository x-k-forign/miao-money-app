import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { TrendingDown, TrendingUp } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { MiaoCard } from "@/components/common/MiaoCard";
import { defaultTheme } from "@/constants/themes";
import type { BudgetAllocationDTO, BudgetPriority } from "@/types/models";
import { centsToYuan, yuanToCents } from "@/utils/money";

interface BudgetAllocationListProps {
  allocations: BudgetAllocationDTO[];
  onChangeAllocation: (categoryId: string, monthlyBudgetCents: number) => void;
}

const priorityLabels: Record<BudgetPriority, string> = {
  fixed: "固定支出",
  essential: "必需消费",
  transport: "交通预算",
  flexible: "弹性消费",
  high_spend: "高消费提醒",
  other: "其他消费"
};

export function BudgetAllocationList({ allocations, onChangeAllocation }: BudgetAllocationListProps) {
  return (
    <View style={styles.list}>
      {allocations.map((item) => {
        const ratio = item.monthlyBudgetCents > 0 ? Math.min(100, Math.round((item.spentCents / item.monthlyBudgetCents) * 100)) : 0;

        return (
          <MiaoCard key={item.categoryId} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.titleBlock}>
                <View style={styles.titleRow}>
                  <Text style={styles.categoryName}>{item.categoryName}</Text>
                  <View style={[styles.priorityTag, item.priority === "high_spend" && styles.warnTag]}>
                    <Text style={styles.priorityText}>{priorityLabels[item.priority]}</Text>
                  </View>
                </View>
                <Text style={styles.suggestion}>{item.suggestion}</Text>
              </View>
              {item.spentCents > item.monthlyBudgetCents ? (
                <TrendingUp color={defaultTheme.pink} size={18} />
              ) : (
                <TrendingDown color={defaultTheme.mint} size={18} />
              )}
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${ratio}%` },
                  item.spentCents > item.monthlyBudgetCents && styles.progressOver
                ]}
              />
            </View>

            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.metaLabel}>已用</Text>
                <Text style={styles.metaValue}>¥{centsToYuan(item.spentCents)}</Text>
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.metaLabel}>月预算</Text>
                <BudgetAmountInput
                  amountCents={item.monthlyBudgetCents}
                  onCommit={(amountCents) => onChangeAllocation(item.categoryId, amountCents)}
                />
              </View>
              <AnimatedPressable
                accessibilityLabel="增加预算"
                onPress={() => onChangeAllocation(item.categoryId, item.monthlyBudgetCents + 10000)}
                style={styles.stepButton}
              >
                <Text style={styles.stepText}>+100</Text>
              </AnimatedPressable>
            </View>
          </MiaoCard>
        );
      })}
    </View>
  );
}

interface BudgetAmountInputProps {
  amountCents: number;
  onCommit: (amountCents: number) => void;
}

function BudgetAmountInput({ amountCents, onCommit }: BudgetAmountInputProps) {
  const [draftValue, setDraftValue] = useState(centsToYuan(amountCents));

  useEffect(() => {
    setDraftValue(centsToYuan(amountCents));
  }, [amountCents]);

  function commitValue() {
    const normalizedValue = draftValue.trim();
    if (!normalizedValue || normalizedValue === ".") {
      setDraftValue(centsToYuan(0));
      onCommit(0);
      return;
    }

    try {
      const nextAmountCents = yuanToCents(normalizedValue);
      setDraftValue(centsToYuan(nextAmountCents));
      onCommit(nextAmountCents);
    } catch {
      setDraftValue(centsToYuan(amountCents));
    }
  }

  return (
    <TextInput
      keyboardType="decimal-pad"
      onBlur={commitValue}
      onChangeText={(value) => {
        if (/^\d*\.?\d{0,2}$/.test(value)) {
          setDraftValue(value);
        }
      }}
      onSubmitEditing={commitValue}
      selectTextOnFocus={false}
      style={styles.budgetInput}
      value={draftValue}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12
  },
  card: {
    gap: 12
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10
  },
  titleBlock: {
    flex: 1,
    gap: 5
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  categoryName: {
    color: defaultTheme.text,
    fontSize: 16,
    fontWeight: "900"
  },
  priorityTag: {
    backgroundColor: "#F2FAFF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  warnTag: {
    backgroundColor: "#FFE4EF"
  },
  priorityText: {
    color: defaultTheme.text,
    fontSize: 11,
    fontWeight: "900"
  },
  suggestion: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 17
  },
  progressTrack: {
    backgroundColor: "#EDF8FF",
    borderRadius: 8,
    height: 10,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    height: "100%"
  },
  progressOver: {
    backgroundColor: defaultTheme.pink
  },
  bottomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  metaLabel: {
    color: defaultTheme.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  metaValue: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3
  },
  inputWrap: {
    flex: 1
  },
  budgetInput: {
    backgroundColor: "#F7FCFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    color: defaultTheme.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
    minHeight: 40,
    paddingHorizontal: 10
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 10
  },
  stepText: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900"
  }
});
