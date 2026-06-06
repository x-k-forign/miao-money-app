import { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarDays, Check, ChevronDown } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";

const today = new Date();
const todayYear = today.getFullYear();
const todayMonth = today.getMonth() + 1;
const todayDay = today.getDate();
const minYear = todayYear - 5;
const minMonth = todayMonth;
const minDay = todayDay;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return {
    day: Number.isFinite(day) ? day : todayDay,
    month: Number.isFinite(month) ? month : todayMonth,
    year: Number.isFinite(year) ? year : todayYear
  };
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getAvailableMonths(year: number) {
  const start = year === minYear ? minMonth : 1;
  const end = year === todayYear ? todayMonth : 12;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function getAvailableDays(year: number, month: number) {
  const start = year === minYear && month === minMonth ? minDay : 1;
  const monthEnd = getDaysInMonth(year, month);
  const end = year === todayYear && month === todayMonth ? Math.min(todayDay, monthEnd) : monthEnd;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

interface RecordDatePickerProps {
  onChange: (value: string) => void;
  value: string;
}

export function RecordDatePicker({ onChange, value }: RecordDatePickerProps) {
  const parsed = parseDate(value);
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(parsed.year);
  const [draftMonth, setDraftMonth] = useState(parsed.month);
  const [draftDay, setDraftDay] = useState(parsed.day);

  const years = useMemo(
    () => Array.from({ length: todayYear - minYear + 1 }, (_, index) => todayYear - index),
    []
  );
  const months = useMemo(() => getAvailableMonths(draftYear), [draftYear]);
  const days = useMemo(() => getAvailableDays(draftYear, draftMonth), [draftYear, draftMonth]);

  function openPicker() {
    const current = parseDate(value);
    setDraftYear(current.year);
    setDraftMonth(current.month);
    setDraftDay(current.day);
    setOpen(true);
  }

  function chooseYear(year: number) {
    const nextMonths = getAvailableMonths(year);
    const nextMonth = nextMonths.includes(draftMonth) ? draftMonth : nextMonths[0];
    const nextDays = getAvailableDays(year, nextMonth);
    const nextDay = nextDays.includes(draftDay) ? draftDay : nextDays[nextDays.length - 1];
    setDraftYear(year);
    setDraftMonth(nextMonth);
    setDraftDay(nextDay);
  }

  function chooseMonth(month: number) {
    const nextDays = getAvailableDays(draftYear, month);
    const nextDay = nextDays.includes(draftDay) ? draftDay : nextDays[nextDays.length - 1];
    setDraftMonth(month);
    setDraftDay(nextDay);
  }

  function confirm() {
    onChange(formatDate(draftYear, draftMonth, draftDay));
    setOpen(false);
  }

  return (
    <>
      <AnimatedPressable accessibilityRole="button" onPress={openPicker} style={styles.fieldButton}>
        <View style={styles.fieldLeft}>
          <View style={styles.iconBubble}>
            <CalendarDays color={defaultTheme.primary} size={18} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>记账日期</Text>
            <Text style={styles.fieldValue}>{value}</Text>
          </View>
        </View>
        <ChevronDown color={defaultTheme.muted} size={20} />
      </AnimatedPressable>

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <AnimatedPressable style={styles.backdropPressArea} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>选择日期</Text>
                <Text style={styles.sheetHint}>
                  可选 {minYear}-{pad(minMonth)}-{pad(minDay)} 至 {todayYear}-{pad(todayMonth)}-{pad(todayDay)}
                </Text>
              </View>
              <AnimatedPressable onPress={confirm} style={styles.confirmButton}>
                <Check color="#FFFFFF" size={17} strokeWidth={3} />
                <Text style={styles.confirmText}>确定</Text>
              </AnimatedPressable>
            </View>

            <View style={styles.columns}>
              <PickerColumn label="年" options={years} selected={draftYear} onSelect={chooseYear} suffix="年" />
              <PickerColumn label="月" options={months} selected={draftMonth} onSelect={chooseMonth} suffix="月" />
              <PickerColumn label="日" options={days} selected={draftDay} onSelect={setDraftDay} suffix="日" />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

interface PickerColumnProps {
  label: string;
  onSelect: (value: number) => void;
  options: number[];
  selected: number;
  suffix: string;
}

function PickerColumn({ label, onSelect, options, selected, suffix }: PickerColumnProps) {
  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.optionList}>
        {options.map((option) => (
          <AnimatedPressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === option }}
            onPress={() => onSelect(option)}
            style={[styles.option, selected === option && styles.optionActive]}
          >
            <Text style={[styles.optionText, selected === option && styles.optionTextActive]}>
              {option}
              {suffix}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldButton: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 12
  },
  fieldLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  fieldLabel: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  fieldValue: {
    color: defaultTheme.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3
  },
  backdrop: {
    backgroundColor: "rgba(41, 70, 91, 0.28)",
    flex: 1,
    justifyContent: "flex-end"
  },
  backdropPressArea: {
    flex: 1
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 16
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14
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
    marginTop: 4
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 12
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  columns: {
    flexDirection: "row",
    gap: 10
  },
  column: {
    flex: 1,
    gap: 8
  },
  columnLabel: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  optionList: {
    maxHeight: 280
  },
  option: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 8,
    minHeight: 42
  },
  optionActive: {
    backgroundColor: defaultTheme.primary
  },
  optionText: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  optionTextActive: {
    color: "#FFFFFF"
  }
});
