import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Check, FileUp, X } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { MiaoCard } from "@/components/common/MiaoCard";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { PageHeader } from "@/components/common/PageHeader";
import { RecordDatePicker } from "@/components/records/RecordDatePicker";
import { defaultTheme } from "@/constants/themes";
import { getCategories } from "@/services/categoryService";
import { addManualRecord } from "@/services/recordService";
import { useRecordStore } from "@/stores/useRecordStore";
import type { CategoryDTO, RecordType } from "@/types/models";
import { getTodayDateString } from "@/utils/date";
import { yuanToCents } from "@/utils/money";

export default function NewRecordScreen() {
  const { requestRefresh } = useRecordStore();
  const [recordType, setRecordType] = useState<RecordType>("expense");
  const [expenseCategories, setExpenseCategories] = useState<CategoryDTO[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDTO[]>([]);
  const categories = recordType === "expense" ? expenseCategories : incomeCategories;
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCategory = useMemo(
    () =>
      categories.find((item) => item.id === categoryId) ??
      categories[0] ?? {
        id: "",
        name: "其他",
        kind: recordType,
        icon: "more",
        color: defaultTheme.primary,
        sortOrder: 0
      },
    [categories, categoryId, recordType]
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([getCategories("expense"), getCategories("income")])
      .then(([nextExpenseCategories, nextIncomeCategories]) => {
        if (mounted) {
          setExpenseCategories(nextExpenseCategories);
          setIncomeCategories(nextIncomeCategories);
          setCategoryId(nextExpenseCategories[0]?.id ?? "");
        }
      })
      .catch((error) => {
        console.warn("Load categories failed", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function changeType(nextType: RecordType) {
    setRecordType(nextType);
    setCategoryId(nextType === "expense" ? expenseCategories[0]?.id ?? "" : incomeCategories[0]?.id ?? "");
  }

  async function save() {
    let amountCents = 0;
    try {
      amountCents = yuanToCents(amount);
    } catch {
      Alert.alert("金额格式不正确", "请输入大于 0 的金额，最多保留两位小数。");
      return;
    }

    if (amountCents <= 0) {
      Alert.alert("金额不能为空", "请输入大于 0 的金额。");
      return;
    }

    if (!categoryId) {
      Alert.alert("请选择分类", "保存前需要选择一个分类。");
      return;
    }

    setSaving(true);
    try {
      await addManualRecord({
        type: recordType,
        amountCents,
        categoryId,
        note,
        recordDate: date
      });
      requestRefresh();
      setSaving(false);
      router.replace("/bills");
    } catch (error) {
      console.warn("Save record failed", error);
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <PageHeader title="添加收支" subtitle="快速记录一笔收入或支出" compact showMenu={false} />

          <Animated.View entering={FadeInUp.delay(40).duration(260)}>
            <MiaoCard style={styles.card}>
              <AnimatedPressable accessibilityLabel="导入账单" onPress={() => router.push("/import" as never)} style={styles.importEntry}>
                <View style={styles.importIcon}>
                  <FileUp color={defaultTheme.primary} size={20} />
                </View>
                <View style={styles.importTextBlock}>
                  <Text style={styles.importTitle}>导入账单</Text>
                  <Text style={styles.importHint}>微信 XLSX、支付宝 CSV</Text>
                </View>
              </AnimatedPressable>

              <View style={styles.segment}>
                {[
                  { key: "expense", label: "支出" },
                  { key: "income", label: "收入" }
                ].map((item) => (
                  <AnimatedPressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: recordType === item.key }}
                    onPress={() => changeType(item.key as RecordType)}
                    style={[styles.segmentOption, recordType === item.key && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, recordType === item.key && styles.segmentTextActive]}>{item.label}</Text>
                  </AnimatedPressable>
                ))}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>金额</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={defaultTheme.muted}
                  style={styles.amountInput}
                  value={amount}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>分类</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((item) => (
                    <AnimatedPressable
                      key={item.id}
                      onPress={() => setCategoryId(item.id)}
                      style={[styles.categoryChip, categoryId === item.id && styles.categoryChipActive]}
                    >
                      <CategoryIcon color={item.color} name={item.icon} size={16} />
                      <Text style={[styles.categoryText, categoryId === item.id && styles.categoryTextActive]}>{item.name}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>日期</Text>
                <RecordDatePicker value={date} onChange={setDate} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>备注</Text>
                <TextInput
                  multiline
                  onChangeText={setNote}
                  placeholder={`给这笔${recordType === "expense" ? "支出" : "收入"}写个备注`}
                  placeholderTextColor={defaultTheme.muted}
                  style={styles.noteInput}
                  value={note}
                />
              </View>

              <View style={styles.preview}>
                <CategoryIcon color={selectedCategory.color} name={selectedCategory.icon} />
                <Text style={styles.previewText}>
                  {selectedCategory.name} · {date} · {amount || "0.00"} 元
                </Text>
              </View>

              {saving ? (
                <View style={styles.savingBox}>
                  <MiaoLoader label="正在保存..." />
                </View>
              ) : (
                <View style={styles.footerButtons}>
                  <AnimatedPressable onPress={() => router.back()} style={styles.ghostButton}>
                    <X color={defaultTheme.muted} size={18} />
                    <Text style={styles.ghostButtonText}>取消</Text>
                  </AnimatedPressable>
                  <AnimatedPressable onPress={save} style={styles.primaryButton}>
                    <Check color="#FFFFFF" size={18} />
                    <Text style={styles.primaryButtonText}>保存</Text>
                  </AnimatedPressable>
                </View>
              )}
            </MiaoCard>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1
  },
  scroll: {
    paddingBottom: 36
  },
  card: {
    gap: 16
  },
  importEntry: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 12
  },
  importIcon: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  importTextBlock: {
    flex: 1,
    gap: 3
  },
  importTitle: {
    color: defaultTheme.text,
    fontSize: 15,
    fontWeight: "900"
  },
  importHint: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800"
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
    minHeight: 42
  },
  segmentActive: {
    backgroundColor: "#FFFFFF"
  },
  segmentText: {
    color: defaultTheme.muted,
    fontSize: 15,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: defaultTheme.text
  },
  field: {
    gap: 9
  },
  label: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  amountInput: {
    backgroundColor: "#F2FAFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    color: defaultTheme.text,
    fontSize: 32,
    fontWeight: "900",
    minHeight: 66,
    paddingHorizontal: 14
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  categoryChip: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 10
  },
  categoryChipActive: {
    backgroundColor: defaultTheme.primarySoft,
    borderColor: defaultTheme.primary
  },
  categoryText: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  categoryTextActive: {
    color: defaultTheme.primary
  },
  noteInput: {
    backgroundColor: "#F7FCFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    color: defaultTheme.text,
    minHeight: 88,
    padding: 12,
    textAlignVertical: "top"
  },
  preview: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  previewText: {
    color: defaultTheme.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "900"
  },
  savingBox: {
    minHeight: 86,
    justifyContent: "center"
  },
  footerButtons: {
    flexDirection: "row",
    gap: 12
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 48
  },
  ghostButtonText: {
    color: defaultTheme.muted,
    fontSize: 15,
    fontWeight: "900"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 48
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
