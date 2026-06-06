import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { defaultTheme } from "@/constants/themes";
import { MiaoCard } from "@/components/common/MiaoCard";

interface StatCardProps {
  label: string;
  value: string;
  accent?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, accent = defaultTheme.primary, icon: Icon }: StatCardProps) {
  return (
    <MiaoCard style={styles.card}>
      <View style={[styles.iconBubble, { backgroundColor: `${accent}40` }]}>
        {Icon ? <Icon color={accent} size={18} strokeWidth={2.6} /> : <View style={[styles.dot, { backgroundColor: accent }]} />}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </MiaoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 8,
    minHeight: 112
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10
  },
  label: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  value: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  }
});
