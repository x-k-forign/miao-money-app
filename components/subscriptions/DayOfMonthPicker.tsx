import { useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarDays, ChevronDown, Check } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";

const days = Array.from({ length: 28 }, (_, index) => index + 1);

interface DayOfMonthPickerProps {
  onChange: (value: number) => void;
  value: number;
}

export function DayOfMonthPicker({ onChange, value }: DayOfMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function openPicker() {
    setOpen(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ animated: false, y: Math.max(0, (value - 4) * 44) });
    }, 0);
  }

  function selectDay(day: number) {
    onChange(day);
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
            <Text style={styles.fieldLabel}>每月几号生成</Text>
            <Text style={styles.fieldValue}>每月 {value} 号</Text>
          </View>
        </View>
        <ChevronDown color={defaultTheme.muted} size={20} />
      </AnimatedPressable>

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <AnimatedPressable style={styles.backdropPressArea} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>选择生成日期</Text>
              <Text style={styles.sheetHint}>支持每月 1-28 号</Text>
            </View>
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={styles.dayList}>
              {days.map((day) => (
                <AnimatedPressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === day }}
                  onPress={() => selectDay(day)}
                  style={[styles.dayRow, value === day && styles.dayRowActive]}
                >
                  <Text style={[styles.dayText, value === day && styles.dayTextActive]}>每月 {day} 号</Text>
                  {value === day ? <Check color="#FFFFFF" size={18} strokeWidth={3} /> : null}
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
    maxHeight: "58%",
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 16
  },
  sheetHeader: {
    gap: 4,
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
    fontWeight: "800"
  },
  dayList: {
    maxHeight: 360
  },
  dayRow: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: 44,
    paddingHorizontal: 14
  },
  dayRowActive: {
    backgroundColor: defaultTheme.primary
  },
  dayText: {
    color: defaultTheme.text,
    fontSize: 15,
    fontWeight: "900"
  },
  dayTextActive: {
    color: "#FFFFFF"
  }
});
