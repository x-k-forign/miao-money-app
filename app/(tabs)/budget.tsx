import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Check, RefreshCcw, SlidersHorizontal } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { MiaoCard } from "@/components/common/MiaoCard";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { PageHeader } from "@/components/common/PageHeader";
import { BudgetAllocationList } from "@/components/budget/BudgetAllocationList";
import { BudgetSummaryCard } from "@/components/budget/BudgetSummaryCard";
import { defaultTheme } from "@/constants/themes";
import {
  generateMonthlyBudgetPlan,
  getSavedMonthlyBudget,
  mergeSavedBudgetWithGenerated,
  optimizeCustomBudgetPlan,
  refreshBudgetSpent,
  saveMonthlyBudgetPlan
} from "@/services/budgetService";
import { useRecordStore } from "@/stores/useRecordStore";
import type { BudgetAllocationDTO, MonthlyBudgetDTO } from "@/types/models";
import { getMonthString } from "@/utils/date";
import { centsToYuan, yuanToCents } from "@/utils/money";

const BUDGET_PAGE_COUNT = 3;

export default function BudgetScreen() {
  const [month] = useState(getMonthString());
  const [expectedIncome, setExpectedIncome] = useState("8000.00");
  const [savingMode, setSavingMode] = useState<"rate" | "target">("rate");
  const [savingRate, setSavingRate] = useState("20");
  const [savingTarget, setSavingTarget] = useState("1000.00");
  const [budget, setBudget] = useState<MonthlyBudgetDTO | null>(null);
  const [allocationPage, setAllocationPage] = useState(0);
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const recordRefreshKey = useRecordStore((state) => state.refreshKey);

  const savingPreview = useMemo(() => {
    try {
      const incomeCents = yuanToCents(expectedIncome || "0");
      if (savingMode === "target") {
        return yuanToCents(savingTarget || "0");
      }
      return Math.round(incomeCents * (Number(savingRate || "0") / 100));
    } catch {
      return 0;
    }
  }, [expectedIncome, savingMode, savingRate, savingTarget]);

  const activeBudget = useMemo(() => {
    if (!budget) {
      return null;
    }

    return {
      ...budget,
      allocations: budget.allocations.filter((item) => !hiddenCategoryIds.includes(item.categoryId))
    };
  }, [budget, hiddenCategoryIds]);
  const allocationPageSize = useMemo(
    () => Math.max(1, Math.ceil((activeBudget?.allocations.length ?? 0) / BUDGET_PAGE_COUNT)),
    [activeBudget?.allocations.length]
  );
  const visibleAllocations = useMemo(() => {
    if (!activeBudget) {
      return [];
    }

    const start = allocationPage * allocationPageSize;
    return activeBudget.allocations.slice(start, start + allocationPageSize);
  }, [activeBudget, allocationPage, allocationPageSize]);
  const visibleRangeStart = activeBudget && activeBudget.allocations.length > 0 ? allocationPage * allocationPageSize + 1 : 0;
  const visibleRangeEnd = activeBudget ? Math.min(activeBudget.allocations.length, visibleRangeStart + visibleAllocations.length - 1) : 0;

  useEffect(() => {
    let mounted = true;

    async function loadBudget() {
      const savedBudget = await getSavedMonthlyBudget(month);
      if (mounted && savedBudget) {
        const generatedBudget = await generateMonthlyBudgetPlan({
          expectedIncomeCents: savedBudget.expectedIncomeCents,
          month,
          savingRate: savedBudget.savingRate ?? null,
          savingTargetCents: savedBudget.savingTargetCents ?? null
        });
        const mergedBudget = mergeSavedBudgetWithGenerated(generatedBudget, savedBudget);
        setExpectedIncome(centsToYuan(savedBudget.expectedIncomeCents));
        if (savedBudget.savingTargetCents != null) {
          setSavingMode("target");
          setSavingTarget(centsToYuan(savedBudget.savingTargetCents));
        } else if (savedBudget.savingRate != null) {
          setSavingMode("rate");
          setSavingRate(String(Math.round(savedBudget.savingRate * 100)));
        }
        setBudget(mergedBudget);
        setHiddenCategoryIds(getDisabledCategoryIds(mergedBudget));
        setAllocationPage(0);
        setLoading(false);
        return;
      }

      await generatePlan();
    }

    loadBudget().catch((error) => {
      console.warn("Load budget failed", error);
      generatePlan();
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const activeLength = activeBudget?.allocations.length ?? 0;
    const maxPage = Math.max(0, Math.ceil(activeLength / allocationPageSize) - 1);

    if (allocationPage > maxPage) {
      setAllocationPage(maxPage);
    }
  }, [activeBudget?.allocations.length, allocationPage, allocationPageSize]);

  useEffect(() => {
    let mounted = true;

    if (!budget) {
      return () => {
        mounted = false;
      };
    }

    refreshBudgetSpent(budget)
      .then((nextBudget) => {
        if (mounted) {
          setBudget((current) => mergeBudgetSpent(current, nextBudget));
        }
      })
      .catch((error) => {
        console.warn("Refresh budget spent failed", error);
      });

    return () => {
      mounted = false;
    };
  }, [recordRefreshKey]);

  async function generatePlan() {
    setLoading(true);
    setSaved(false);

    try {
      const expectedIncomeCents = yuanToCents(expectedIncome || "0");
      const nextBudget = await generateMonthlyBudgetPlan({
        expectedIncomeCents,
        month,
        savingRate: savingMode === "rate" ? Number(savingRate || "0") / 100 : null,
        savingTargetCents: savingMode === "target" ? yuanToCents(savingTarget || "0") : null
      });
      setBudget(nextBudget);
      setHiddenCategoryIds(getDisabledCategoryIds(nextBudget));
      setAllocationPage(0);
    } catch (error) {
      console.warn("Generate budget failed", error);
      Alert.alert("预算生成失败", "请检查预计收入和储蓄金额格式。");
    } finally {
      setLoading(false);
    }
  }

  function changeAllocation(categoryId: string, monthlyBudgetCents: number) {
    setSaved(false);
    setBudget((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        allocations: current.allocations.map((item) =>
          item.categoryId === categoryId
            ? {
                ...item,
                dailyBudgetCents: Math.round(Math.max(0, monthlyBudgetCents) / 30),
                monthlyBudgetCents: Math.max(0, monthlyBudgetCents)
              }
            : item
        )
      };
    });
  }

  async function saveBudget() {
    if (!activeBudget) {
      return;
    }

    try {
      await saveMonthlyBudgetPlan(activeBudget);
      setSaved(true);
    } catch (error) {
      console.warn("Save budget failed", error);
      Alert.alert("保存失败", "预算方案暂时无法写入本地数据库。");
    }
  }

  function toggleAllocationVisible(categoryId: string) {
    setSaved(false);
    setAllocationPage(0);
    setHiddenCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId]
    );
  }

  function optimizeCustomBudget() {
    if (!budget || !activeBudget) {
      return;
    }

    const optimizedBudget = optimizeCustomBudgetPlan(activeBudget);
    const optimizedByCategoryId = new Map(optimizedBudget.allocations.map((allocation) => [allocation.categoryId, allocation]));

    setSaved(false);
    setBudget((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        allocations: current.allocations.map((allocation) => optimizedByCategoryId.get(allocation.categoryId) ?? allocation)
      };
    });
    setAllocationPage(0);
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <PageHeader title="预算分配" subtitle="按收入档位、固定支出和上月消费结构生成本月预算" />

          <Animated.View entering={FadeInUp.delay(40).duration(260)}>
            <MiaoCard style={styles.formCard}>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.cardTitle}>{month} 预算</Text>
                  <Text style={styles.cardHint}>储蓄预留：¥{centsToYuan(savingPreview)}</Text>
                </View>
                <SlidersHorizontal color={defaultTheme.primary} size={22} />
              </View>

              <TextField label="每月预计收入" value={expectedIncome} onChangeText={setExpectedIncome} keyboardType="decimal-pad" />

              <View style={styles.segment}>
                {[
                  { key: "rate", label: "按比例储蓄" },
                  { key: "target", label: "按目标储蓄" }
                ].map((item) => (
                  <AnimatedPressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: savingMode === item.key }}
                    onPress={() => setSavingMode(item.key as "rate" | "target")}
                    style={[styles.segmentOption, savingMode === item.key && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, savingMode === item.key && styles.segmentTextActive]}>{item.label}</Text>
                  </AnimatedPressable>
                ))}
              </View>

              {savingMode === "rate" ? (
                <TextField label="储蓄预留比例（%）" value={savingRate} onChangeText={setSavingRate} keyboardType="decimal-pad" />
              ) : (
                <TextField label="储蓄目标金额" value={savingTarget} onChangeText={setSavingTarget} keyboardType="decimal-pad" />
              )}

              <AnimatedPressable onPress={generatePlan} style={styles.primaryButton}>
                <RefreshCcw color="#FFFFFF" size={18} />
                <Text style={styles.primaryText}>重新生成预算</Text>
              </AnimatedPressable>

              <AnimatedPressable onPress={optimizeCustomBudget} style={styles.secondaryButton}>
                <SlidersHorizontal color={defaultTheme.primary} size={18} />
                <Text style={styles.secondaryText}>智能优化自定义预算</Text>
              </AnimatedPressable>
            </MiaoCard>
          </Animated.View>

          {loading ? (
            <View style={styles.loaderBox}>
              <MiaoLoader label="正在生成预算..." />
            </View>
          ) : budget && activeBudget ? (
            <>
              <Animated.View entering={FadeInUp.delay(70).duration(260)}>
                <BudgetCategoryVisibilityPanel
                  allocations={budget.allocations}
                  hiddenCategoryIds={hiddenCategoryIds}
                  onToggle={toggleAllocationVisible}
                />
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(80).duration(260)}>
                <BudgetSummaryCard budget={activeBudget} />
              </Animated.View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>分类预算</Text>
                <Text style={styles.sectionMeta}>
                  {visibleRangeStart}-{visibleRangeEnd} / {activeBudget.allocations.length} 项
                </Text>
              </View>

              {activeBudget.allocations.length > 0 ? (
                <View style={styles.pageSwitch}>
                  {Array.from({ length: BUDGET_PAGE_COUNT }, (_, index) => {
                    const start = index * allocationPageSize + 1;
                    const end = Math.min(activeBudget.allocations.length, start + allocationPageSize - 1);
                    const active = allocationPage === index;

                    return (
                      <AnimatedPressable
                        key={index}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setAllocationPage(index)}
                        style={[styles.pageButton, active && styles.pageButtonActive]}
                      >
                        <Text style={[styles.pageButtonText, active && styles.pageButtonTextActive]}>第 {index + 1} 页</Text>
                        <Text style={[styles.pageButtonMeta, active && styles.pageButtonTextActive]}>
                          {start}-{end}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              ) : null}

              {activeBudget.allocations.length > 0 ? (
                <BudgetAllocationList allocations={visibleAllocations} onChangeAllocation={changeAllocation} />
              ) : (
                <MiaoCard style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>没有开启的分类</Text>
                  <Text style={styles.emptyText}>请在上方分类开关中至少开启一个分类，再查看预算。</Text>
                </MiaoCard>
              )}

              <AnimatedPressable onPress={saveBudget} style={[styles.saveButton, saved && styles.savedButton]}>
                <Check color="#FFFFFF" size={18} />
                <Text style={styles.saveText}>{saved ? "已保存当前方案" : "保存预算方案"}</Text>
              </AnimatedPressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

interface BudgetCategoryVisibilityPanelProps {
  allocations: BudgetAllocationDTO[];
  hiddenCategoryIds: string[];
  onToggle: (categoryId: string) => void;
}

function BudgetCategoryVisibilityPanel({ allocations, hiddenCategoryIds, onToggle }: BudgetCategoryVisibilityPanelProps) {
  const enabledCount = allocations.length - hiddenCategoryIds.length;

  return (
    <MiaoCard style={styles.visibilityCard}>
      <View style={styles.visibilityHeader}>
        <View>
          <Text style={styles.visibilityTitle}>分类开关</Text>
          <Text style={styles.visibilityHint}>隐藏非必要消费后，预算汇总和保存方案会直接排除。</Text>
        </View>
        <Text style={styles.visibilityCount}>{enabledCount} 开启</Text>
      </View>

      <View style={styles.visibilityGrid}>
        {allocations.map((item) => {
          const hidden = hiddenCategoryIds.includes(item.categoryId);

          return (
            <AnimatedPressable
              key={item.categoryId}
              accessibilityRole="button"
              accessibilityState={{ checked: !hidden }}
              onPress={() => onToggle(item.categoryId)}
              style={[styles.visibilityChip, hidden && styles.visibilityChipHidden]}
            >
              <Text style={[styles.visibilityName, hidden && styles.visibilityNameHidden]} numberOfLines={1}>
                {item.categoryName}
              </Text>
              <View style={[styles.visibilityState, hidden ? styles.visibilityStateHidden : styles.visibilityStateOn]}>
                <Text style={[styles.visibilityStateText, hidden && styles.visibilityStateTextHidden]}>
                  {hidden ? "隐藏" : "开启"}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </MiaoCard>
  );
}

function getDisabledCategoryIds(budget: MonthlyBudgetDTO): string[] {
  return budget.allocations.filter((item) => item.enabled === false).map((item) => item.categoryId);
}

function mergeBudgetSpent(current: MonthlyBudgetDTO | null, nextBudget: MonthlyBudgetDTO): MonthlyBudgetDTO | null {
  if (!current) {
    return current;
  }

  const nextSpentByCategory = new Map(
    nextBudget.allocations.map((allocation) => [
      allocation.categoryId,
      {
        spentCents: allocation.spentCents,
        suggestion: allocation.suggestion
      }
    ])
  );

  return {
    ...current,
    allocations: current.allocations.map((allocation) => {
      const nextSpent = nextSpentByCategory.get(allocation.categoryId);
      if (!nextSpent) {
        return {
          ...allocation,
          spentCents: 0
        };
      }

      return {
        ...allocation,
        spentCents: nextSpent.spentCents,
        suggestion: nextSpent.suggestion
      };
    })
  };
}

interface TextFieldProps {
  keyboardType?: "default" | "decimal-pad";
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}

function TextField({ keyboardType = "default", label, onChangeText, value }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder="0.00"
        placeholderTextColor={defaultTheme.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1
  },
  scroll: {
    paddingBottom: 118
  },
  formCard: {
    gap: 14,
    marginBottom: 14
  },
  formHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardTitle: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  cardHint: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  field: {
    gap: 8
  },
  label: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  input: {
    backgroundColor: "#F7FCFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    color: defaultTheme.text,
    fontSize: 16,
    fontWeight: "900",
    minHeight: 48,
    paddingHorizontal: 12
  },
  segment: {
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    flexDirection: "row",
    padding: 4
  },
  segmentOption: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 40
  },
  segmentActive: {
    backgroundColor: "#FFFFFF"
  },
  segmentText: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: defaultTheme.text
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46
  },
  secondaryText: {
    color: defaultTheme.primary,
    fontSize: 14,
    fontWeight: "900"
  },
  loaderBox: {
    minHeight: 190,
    justifyContent: "center"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sectionTitle: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  sectionMeta: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  visibilityCard: {
    gap: 12,
    marginBottom: 14
  },
  visibilityHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  visibilityTitle: {
    color: defaultTheme.text,
    fontSize: 17,
    fontWeight: "900"
  },
  visibilityHint: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  visibilityCount: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  visibilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  visibilityChip: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 9
  },
  visibilityChipHidden: {
    backgroundColor: "#FFFFFF",
    opacity: 0.58
  },
  visibilityName: {
    color: defaultTheme.text,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 86
  },
  visibilityNameHidden: {
    color: defaultTheme.muted
  },
  visibilityState: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  visibilityStateOn: {
    backgroundColor: defaultTheme.primary
  },
  visibilityStateHidden: {
    backgroundColor: "#EEF6FB"
  },
  visibilityStateText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900"
  },
  visibilityStateTextHidden: {
    color: defaultTheme.muted
  },
  pageSwitch: {
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    padding: 4
  },
  pageButton: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 46
  },
  pageButtonActive: {
    backgroundColor: "#FFFFFF"
  },
  pageButtonText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  pageButtonMeta: {
    color: defaultTheme.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  pageButtonTextActive: {
    color: defaultTheme.primary
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50
  },
  savedButton: {
    backgroundColor: "#42B992"
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  emptyCard: {
    gap: 4
  },
  emptyTitle: {
    color: defaultTheme.text,
    fontSize: 15,
    fontWeight: "900"
  },
  emptyText: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 17
  }
});
