import { StyleSheet, Text, TextInput, View } from "react-native";
import { Bell, Minus, Plus } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";

interface SubscriptionReminderFieldsProps {
  daysBefore: number;
  enabled: boolean;
  onChangeDaysBefore: (value: number) => void;
  onChangeEnabled: (value: boolean) => void;
  onChangeTime: (value: string) => void;
  time: string;
}

export function SubscriptionReminderFields({
  daysBefore,
  enabled,
  onChangeDaysBefore,
  onChangeEnabled,
  onChangeTime,
  time
}: SubscriptionReminderFieldsProps) {
  const normalizedDays = Math.max(0, Math.min(28, daysBefore));

  function step(delta: number) {
    onChangeDaysBefore(Math.max(0, Math.min(28, normalizedDays + delta)));
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Bell color={defaultTheme.primary} size={18} />
          </View>
          <View>
            <Text style={styles.title}>订阅提醒</Text>
            <Text style={styles.hint}>默认提前 3 天中午 12:00</Text>
          </View>
        </View>
        <AnimatedPressable
          accessibilityLabel={enabled ? "关闭提醒" : "开启提醒"}
          onPress={() => onChangeEnabled(!enabled)}
          style={[styles.toggle, enabled && styles.toggleOn]}
        >
          <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
        </AnimatedPressable>
      </View>

      {enabled ? (
        <View style={styles.fields}>
          <View style={styles.stepper}>
            <Text style={styles.fieldLabel}>提前天数</Text>
            <View style={styles.stepperControls}>
              <AnimatedPressable onPress={() => step(-1)} style={styles.stepButton}>
                <Minus color={defaultTheme.primary} size={16} />
              </AnimatedPressable>
              <Text style={styles.daysValue}>{normalizedDays} 天</Text>
              <AnimatedPressable onPress={() => step(1)} style={styles.stepButton}>
                <Plus color={defaultTheme.primary} size={16} />
              </AnimatedPressable>
            </View>
          </View>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>提醒时间</Text>
            <TextInput
              onChangeText={onChangeTime}
              placeholder="12:00"
              placeholderTextColor={defaultTheme.muted}
              style={styles.timeInput}
              value={time}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    gap: 12,
    padding: 12
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  title: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  hint: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
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
  fields: {
    flexDirection: "row",
    gap: 10
  },
  stepper: {
    flex: 1,
    gap: 7
  },
  fieldLabel: {
    color: defaultTheme.text,
    fontSize: 12,
    fontWeight: "900"
  },
  stepperControls: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 8
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: "#F2FAFF",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  daysValue: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  timeField: {
    gap: 7,
    width: 112
  },
  timeInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900",
    minHeight: 42,
    paddingHorizontal: 10
  }
});
