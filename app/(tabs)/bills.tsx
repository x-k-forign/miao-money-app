import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Edit3, Trash2, WalletCards } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { MiaoCard } from "@/components/common/MiaoCard";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { PageStepper } from "@/components/common/PageStepper";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { defaultTheme } from "@/constants/themes";
import { deleteAllRecordRows, deleteRecordById, getMonthlyRecords, getRecordsByDate } from "@/services/recordService";
import { useRecordStore } from "@/stores/useRecordStore";
import type { RecordDTO } from "@/types/models";
import { getDateOptions, getMonthOptions, getTodayDateString } from "@/utils/date";
import { centsToYuan } from "@/utils/money";
import { summarizeRecords } from "@/services/analysisService";

const RECORD_PAGE_SIZE = 20;

function money(cents: number) {
  return `¥${centsToYuan(cents)}`;
}

function groupRecords(records: RecordDTO[]) {
  return records.reduce<Record<string, RecordDTO[]>>((groups, record) => {
    groups[record.recordDate] = [...(groups[record.recordDate] ?? []), record];
    return groups;
  }, {});
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  return `${year}.${month}`;
}

function formatDateLabel(value: string) {
  const [, month, day] = value.split("-");
  return `${month}-${day}`;
}

export default function BillsScreen() {
  const { refreshKey, requestRefresh } = useRecordStore();
  const [records, setRecords] = useState<RecordDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"month" | "date">("month");
  const [recordPage, setRecordPage] = useState(0);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);
  const dateOptions = useMemo(() => getDateOptions(selectedMonth), [selectedMonth]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  useEffect(() => {
    let mounted = true;

    async function loadRecords() {
      setLoading(true);
      const nextRecords = mode === "month" ? await getMonthlyRecords(selectedMonth) : await getRecordsByDate(selectedDate);
      if (mounted) {
        setRecords(nextRecords);
        setLoading(false);
      }
    }

    loadRecords().catch((error) => {
      console.warn("Load records failed", error);
      if (mounted) {
        setRecords([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [mode, refreshKey, selectedDate, selectedMonth]);

  useEffect(() => {
    setRecordPage(0);
  }, [mode, selectedDate, selectedMonth]);

  useEffect(() => {
    if (!dateOptions.includes(selectedDate)) {
      setSelectedDate(dateOptions[0]);
    }
  }, [dateOptions, selectedDate]);

  const summary = useMemo(() => {
    const result = summarizeRecords(records);
    return {
      balance: result.balanceCents,
      expense: result.expenseCents,
      income: result.incomeCents
    };
  }, [records]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(records.length / RECORD_PAGE_SIZE)), [records.length]);
  const safeRecordPage = Math.min(recordPage, pageCount - 1);
  const visibleRecords = useMemo(
    () => records.slice(safeRecordPage * RECORD_PAGE_SIZE, safeRecordPage * RECORD_PAGE_SIZE + RECORD_PAGE_SIZE),
    [records, safeRecordPage]
  );
  const grouped = useMemo(() => groupRecords(visibleRecords), [visibleRecords]);

  useEffect(() => {
    if (recordPage > pageCount - 1) {
      setRecordPage(Math.max(0, pageCount - 1));
    }
  }, [pageCount, recordPage]);

  async function removeRecord(id: string) {
    await deleteRecordById(id);
    requestRefresh();
  }

  async function clearAllRecords() {
    await deleteAllRecordRows();
    setRecords([]);
    setRecordPage(0);
    requestRefresh();
  }

  function confirmClearAllRecords() {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window === "undefined"
          ? true
          : window.confirm("会删除 Web 测试端全部手动、订阅生成和导入账单，分类、订阅和预算设置不会删除。");

      if (confirmed) {
        clearAllRecords().catch((error) => {
          console.warn("Clear all records failed", error);
        });
      }
      return;
    }

    Alert.alert("清空所有账单", "会删除本机全部手动、订阅生成和导入账单，分类、订阅和预算设置不会删除。", [
      { text: "取消", style: "cancel" },
      {
        text: "清空",
        style: "destructive",
        onPress: () => {
          clearAllRecords().catch((error) => {
            console.warn("Clear all records failed", error);
          });
        }
      }
    ]);
  }

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.loadingBox}>
          <MiaoLoader label="正在加载本月账单..." />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageHeader title="miao~记账" subtitle="今天也轻轻松松整理小钱钱" />

        <Animated.View entering={FadeInUp.delay(40).duration(260)} style={styles.summaryGrid}>
          <StatCard label={mode === "month" ? "本月收入" : "当日收入"} value={money(summary.income)} accent={defaultTheme.mint} icon={ArrowUpRight} />
          <StatCard label={mode === "month" ? "本月支出" : "当日支出"} value={money(summary.expense)} accent={defaultTheme.pink} icon={ArrowDownRight} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).duration(260)}>
          <MiaoCard style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View>
                <Text style={styles.balanceLabel}>{mode === "month" ? "本月结余" : "当日结余"}</Text>
                <Text style={styles.balanceValue}>{money(summary.balance)}</Text>
              </View>
              <View style={styles.walletBadge}>
                <WalletCards color={defaultTheme.primary} size={26} />
              </View>
            </View>
            <View style={styles.segment}>
              {[
                { key: "month", label: "按月份" },
                { key: "date", label: "按日期" }
              ].map((item) => (
                <AnimatedPressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === item.key }}
                  onPress={() => {
                    const nextMode = item.key as "month" | "date";
                    setMode(nextMode);
                    if (nextMode === "date" && !selectedDate.startsWith(selectedMonth)) {
                      setSelectedDate(dateOptions[0]);
                    }
                  }}
                  style={[styles.segmentOption, mode === item.key && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, mode === item.key && styles.segmentTextActive]}>{item.label}</Text>
                </AnimatedPressable>
              ))}
            </View>
            <BillRangePicker
              label={mode === "month" ? "账单月份" : "账单日期"}
              mode={mode}
              onChange={mode === "month" ? setSelectedMonth : setSelectedDate}
              options={mode === "month" ? monthOptions : dateOptions}
              value={mode === "month" ? selectedMonth : selectedDate}
            />
            <AnimatedPressable onPress={confirmClearAllRecords} style={styles.clearAllButton}>
              <Trash2 color={defaultTheme.pink} size={16} />
              <Text style={styles.clearAllText}>清空所有账单</Text>
            </AnimatedPressable>
          </MiaoCard>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{mode === "month" ? formatMonthLabel(selectedMonth) : selectedDate}</Text>
          <Text style={styles.sectionMeta}>
            {records.length > RECORD_PAGE_SIZE
              ? `${safeRecordPage * RECORD_PAGE_SIZE + 1}-${Math.min(records.length, (safeRecordPage + 1) * RECORD_PAGE_SIZE)} / ${records.length} 笔`
              : `${records.length} 笔`}
          </Text>
        </View>

        <PageStepper page={safeRecordPage} pageSize={RECORD_PAGE_SIZE} total={records.length} onChange={setRecordPage} />

        {Object.entries(grouped).map(([date, items], groupIndex) => (
          <Animated.View key={date} entering={FadeInUp.delay(120 + groupIndex * 45).duration(260)} style={styles.dayGroup}>
            <Text style={styles.dateTitle}>{date}</Text>
            {items.map((record) => (
              <MiaoCard key={record.id} style={styles.recordCard}>
                <View style={styles.recordMain}>
                  <CategoryIcon color={record.categoryColor} name={record.categoryIcon} />
                  <View style={styles.recordText}>
                    <Text style={styles.recordTitle}>{record.categoryName}</Text>
                    <Text style={styles.recordNote} numberOfLines={1}>
                      {record.note}
                    </Text>
                  </View>
                  <Text style={[styles.recordAmount, record.type === "income" ? styles.income : styles.expense]}>
                    {record.type === "income" ? "+" : "-"}
                    {money(record.amountCents)}
                  </Text>
                </View>
                <View style={styles.recordActions}>
                  <View style={styles.sourceTag}>
                    <Text style={styles.sourceText}>{getSourceLabel(record.source)}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <Link href={`/record/${record.id}/edit`} asChild>
                      <AnimatedPressable accessibilityLabel="编辑账单" style={styles.iconButton}>
                        <Edit3 color={defaultTheme.primary} size={16} />
                      </AnimatedPressable>
                    </Link>
                    <AnimatedPressable
                      accessibilityLabel="删除账单"
                      onPress={() => removeRecord(record.id)}
                      style={styles.iconButton}
                    >
                      <Trash2 color={defaultTheme.pink} size={16} />
                    </AnimatedPressable>
                  </View>
                </View>
              </MiaoCard>
            ))}
          </Animated.View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

function getSourceLabel(source: RecordDTO["source"]): string {
  if (source === "import") {
    return "导入账单";
  }

  return source === "manual" ? "手动添加" : "订阅生成";
}

interface BillRangePickerProps {
  label: string;
  mode: "month" | "date";
  onChange: (value: string) => void;
  options: string[];
  value: string;
}

function BillRangePicker({ label, mode, onChange, options, value }: BillRangePickerProps) {
  const [open, setOpen] = useState(false);

  function formatValue(item: string) {
    return mode === "month" ? formatMonthLabel(item) : item;
  }

  function select(item: string) {
    onChange(item);
    setOpen(false);
  }

  return (
    <>
      <AnimatedPressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.pickerField}>
        <View style={styles.pickerLeft}>
          <View style={styles.pickerIcon}>
            <CalendarDays color={defaultTheme.primary} size={18} />
          </View>
          <View>
            <Text style={styles.pickerLabel}>{label}</Text>
            <Text style={styles.pickerValue}>{formatValue(value)}</Text>
          </View>
        </View>
        <ChevronDown color={defaultTheme.muted} size={20} />
      </AnimatedPressable>

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <AnimatedPressable onPress={() => setOpen(false)} style={styles.modalPressArea} />
          <View style={styles.rangeSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Text style={styles.sheetHint}>{mode === "month" ? "可选择最近 12 个月" : "可选择当前月份内日期"}</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionList}>
              {options.map((item) => {
                const active = item === value;
                return (
                  <AnimatedPressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => select(item)}
                    style={[styles.optionRow, active && styles.optionRowActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{formatValue(item)}</Text>
                    {active ? <Check color="#FFFFFF" size={17} strokeWidth={3} /> : null}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 110
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center"
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  balanceCard: {
    backgroundColor: defaultTheme.primarySoft,
    gap: 14,
    marginBottom: 16
  },
  balanceTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  balanceLabel: {
    color: defaultTheme.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  balanceValue: {
    color: defaultTheme.text,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6
  },
  walletBadge: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  segment: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    flexDirection: "row",
    padding: 4
  },
  segmentOption: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 38
  },
  segmentActive: {
    backgroundColor: defaultTheme.primary
  },
  segmentText: {
    color: defaultTheme.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: "#FFFFFF"
  },
  pickerField: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 12
  },
  clearAllButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#FFEAF2",
    borderColor: "#FFD1DF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12
  },
  clearAllText: {
    color: defaultTheme.pink,
    fontSize: 12,
    fontWeight: "900"
  },
  pickerLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  pickerIcon: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  pickerLabel: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  pickerValue: {
    color: defaultTheme.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3
  },
  modalBackdrop: {
    backgroundColor: "rgba(41, 70, 91, 0.28)",
    flex: 1,
    justifyContent: "flex-end"
  },
  modalPressArea: {
    flex: 1
  },
  rangeSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: "58%",
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  sheetTitle: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  sheetHint: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3
  },
  optionList: {
    maxHeight: 330
  },
  optionRow: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: 46,
    paddingHorizontal: 13
  },
  optionRowActive: {
    backgroundColor: defaultTheme.primary
  },
  optionText: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  optionTextActive: {
    color: "#FFFFFF"
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
  dayGroup: {
    gap: 10,
    marginBottom: 14
  },
  dateTitle: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  recordCard: {
    gap: 12,
    padding: 14
  },
  recordMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  recordText: {
    flex: 1,
    gap: 3
  },
  recordTitle: {
    color: defaultTheme.text,
    fontSize: 15,
    fontWeight: "900"
  },
  recordNote: {
    color: defaultTheme.muted,
    fontSize: 12
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: "900"
  },
  income: {
    color: "#42B992"
  },
  expense: {
    color: "#F07FA4"
  },
  recordActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sourceTag: {
    backgroundColor: "#F2FAFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  sourceText: {
    color: defaultTheme.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  }
});
