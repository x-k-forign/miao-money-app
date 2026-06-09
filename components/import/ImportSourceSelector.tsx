import { StyleSheet, Text, View } from "react-native";
import { MessageCircle, WalletCards } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";
import type { ImportProvider } from "@/types/models";

interface ImportSourceSelectorProps {
  onChange: (provider: ImportProvider) => void;
  value: ImportProvider;
}

const sources = [
  { icon: MessageCircle, key: "wechat", label: "微信" },
  { icon: WalletCards, key: "alipay", label: "支付宝" }
] as const;

export function ImportSourceSelector({ onChange, value }: ImportSourceSelectorProps) {
  return (
    <View style={styles.grid}>
      {sources.map((item) => {
        const active = value === item.key;
        const Icon = item.icon;

        return (
          <AnimatedPressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.key)}
            style={[styles.sourceButton, active && styles.sourceActive]}
          >
            <View style={[styles.iconBox, active && styles.iconActive]}>
              <Icon color={active ? "#FFFFFF" : defaultTheme.primary} size={22} />
            </View>
            <Text style={[styles.sourceText, active && styles.sourceTextActive]}>{item.label}</Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "column",
    gap: 10,
    width: "100%"
  },
  sourceButton: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-start",
    minHeight: 64,
    paddingHorizontal: 12
  },
  sourceActive: {
    backgroundColor: defaultTheme.primarySoft,
    borderColor: defaultTheme.primary
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  iconActive: {
    backgroundColor: defaultTheme.primary
  },
  sourceText: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  sourceTextActive: {
    color: defaultTheme.primary
  }
});
