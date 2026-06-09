import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Check, X } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { MiaoCard } from "@/components/common/MiaoCard";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { PageHeader } from "@/components/common/PageHeader";
import { DayOfMonthPicker } from "@/components/subscriptions/DayOfMonthPicker";
import { SubscriptionReminderFields } from "@/components/subscriptions/SubscriptionReminderFields";
import { defaultTheme } from "@/constants/themes";
import { getCategories } from "@/services/categoryService";
import { getSubscriptionById, updateSubscriptionById } from "@/services/subscriptionService";
import { useRecordStore } from "@/stores/useRecordStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import type { CategoryDTO, RecordType } from "@/types/models";
import { centsToYuan, yuanToCents } from "@/utils/money";

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requestRefresh } = useSubscriptionStore();
  const requestRecordRefresh = useRecordStore((state) => state.requestRefresh);
  const [type, setType] = useState<RecordType>("expense");
  const [expenseCategories, setExpenseCategories] = useState<CategoryDTO[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDTO[]>([]);
  const categories = type === "expense" ? expenseCategories : incomeCategories;
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [day, setDay] = useState(1);
  const [note, setNote] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [reminderTime, setReminderTime] = useState("12:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadForm() {
      const [nextExpenseCategories, nextIncomeCategories, subscription] = await Promise.all([
        getCategories("expense"),
        getCategories("income"),
        id ? getSubscriptionById(id) : Promise.resolve(undefined)
      ]);

      if (!mounted) {
        return;
      }

      setExpenseCategories(nextExpenseCategories);
      setIncomeCategories(nextIncomeCategories);

      if (subscription) {
        setType(subscription.type);
        setCategoryId(subscription.categoryId);
        setName(subscription.name);
        setAmount(centsToYuan(subscription.amountCents));
        setDay(subscription.dayOfMonth);
        setNote(subscription.note);
        setEnabled(subscription.enabled);
        setReminderEnabled(subscription.reminderEnabled ?? true);
        setReminderDaysBefore(subscription.reminderDaysBefore ?? 3);
        setReminderTime(subscription.reminderTime ?? "12:00");
      }
    }

    loadForm().catch((error) => {
      console.warn("Load subscription form failed", error);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  function changeType(nextType: RecordType) {
    setType(nextType);
    setCategoryId(nextType === "expense" ? expenseCategories[0]?.id ?? "" : incomeCategories[0]?.id ?? "");
  }

  async function save() {
    if (!id) {
      return;
    }

    setSaving(true);
    try {
      await updateSubscriptionById(id, {
        name,
        type,
        amountCents: yuanToCents(amount || "0"),
        categoryId,
        dayOfMonth: day,
        enabled,
        note,
        reminderDaysBefore,
        reminderEnabled,
        reminderTime
      });
      requestRecordRefresh();
      requestRefresh();
      setSaving(false);
      router.back();
    } catch (error) {
      console.warn("Update subscription failed", error);
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <PageHeader title="编辑订阅" subtitle={`订阅 ID：${id ?? ""}`} compact showMenu={false} />

          <Animated.View entering={FadeInUp.delay(40).duration(260)}>
            <MiaoCard style={styles.card}>
              <View style={styles.segment}>
                {[
                  { key: "expense", label: "固定支出" },
                  { key: "income", label: "固定收入" }
                ].map((item) => (
                  <AnimatedPressable
                    key={item.key}
                    onPress={() => changeType(item.key as RecordType)}
                    style={[styles.segmentOption, type === item.key && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, type === item.key && styles.segmentTextActive]}>{item.label}</Text>
                  </AnimatedPressable>
                ))}
              </View>

              <TextField label="名称" value={name} onChangeText={setName} placeholder="订阅名称" />
              <TextField label="金额" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />

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
                <Text style={styles.label}>生成日期</Text>
                <DayOfMonthPicker value={day} onChange={setDay} />
              </View>

              <TextField label="备注" value={note} onChangeText={setNote} placeholder="备注" multiline />

              <SubscriptionReminderFields
                daysBefore={reminderDaysBefore}
                enabled={reminderEnabled}
                onChangeDaysBefore={setReminderDaysBefore}
                onChangeEnabled={setReminderEnabled}
                onChangeTime={setReminderTime}
                time={reminderTime}
              />

              <View style={styles.enableRow}>
                <View>
                  <Text style={styles.enableTitle}>启用订阅</Text>
                  <Text style={styles.enableHint}>关闭后不会自动生成账单</Text>
                </View>
                <AnimatedPressable onPress={() => setEnabled((value) => !value)} style={[styles.toggle, enabled && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
                </AnimatedPressable>
              </View>

              {saving ? (
                <View style={styles.savingBox}>
                  <MiaoLoader label="正在更新订阅..." />
                </View>
              ) : (
                <View style={styles.footerButtons}>
                  <AnimatedPressable onPress={() => router.back()} style={styles.ghostButton}>
                    <X color={defaultTheme.muted} size={18} />
                    <Text style={styles.ghostButtonText}>取消</Text>
                  </AnimatedPressable>
                  <AnimatedPressable onPress={save} style={styles.primaryButton}>
                    <Check color="#FFFFFF" size={18} />
                    <Text style={styles.primaryButtonText}>保存修改</Text>
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

interface TextFieldProps {
  keyboardType?: "default" | "decimal-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}

function TextField({ keyboardType = "default", label, multiline, onChangeText, placeholder, value }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={defaultTheme.muted}
        style={[styles.textInput, multiline && styles.noteInput]}
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
    paddingBottom: 36
  },
  card: {
    gap: 16
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
    fontSize: 14,
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
  textInput: {
    backgroundColor: "#F7FCFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    color: defaultTheme.text,
    minHeight: 48,
    paddingHorizontal: 12
  },
  noteInput: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: "top"
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
  enableRow: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12
  },
  enableTitle: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  enableHint: {
    color: defaultTheme.muted,
    fontSize: 12,
    marginTop: 3
  },
  toggle: {
    backgroundColor: "#D8E7F0",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 44
  },
  toggleOn: {
    backgroundColor: defaultTheme.primary
  },
  toggleKnob: {
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    height: 18,
    width: 18
  },
  toggleKnobOn: {
    marginLeft: 20
  },
  savingBox: {
    justifyContent: "center",
    minHeight: 86
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
