import { StyleSheet, Text, View } from "react-native";
import { CalendarDays, PiggyBank, WalletCards } from "lucide-react-native";
import { MiaoCard } from "@/components/common/MiaoCard";
import { defaultTheme } from "@/constants/themes";
import { getIncomeBudgetTierProfile } from "@/services/budgetService";
import type { MonthlyBudgetDTO } from "@/types/models";
import { centsToYuan } from "@/utils/money";

interface BudgetSummaryCardProps {
  budget: MonthlyBudgetDTO;
}

function money(cents: number) {
  return `¥${centsToYuan(cents)}`;
}

export function BudgetSummaryCard({ budget }: BudgetSummaryCardProps) {
  const totalPlanned = budget.allocations.reduce((sum, item) => sum + item.monthlyBudgetCents, 0);
  const totalSpent = budget.allocations.reduce((sum, item) => sum + item.spentCents, 0);
  const dailyBudget = budget.allocations.reduce((sum, item) => sum + item.dailyBudgetCents, 0);
  const tierProfile = getIncomeBudgetTierProfile(budget.expectedIncomeCents);

  return (
    <MiaoCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>本月可分配</Text>
          <Text style={styles.value}>{money(budget.availableBudgetCents)}</Text>
          <View style={styles.tierRow}>
            <Text style={styles.tierText}>{tierProfile.label}</Text>
          </View>
        </View>
        <View style={styles.iconBox}>
          <PiggyBank color={defaultTheme.primary} size={26} />
        </View>
      </View>
      <Text style={styles.description}>{tierProfile.description}</Text>
      <View style={styles.metricGrid}>
        <Metric icon={WalletCards} label="已规划" value={money(totalPlanned)} />
        <Metric icon={CalendarDays} label="每日可用" value={money(dailyBudget)} />
        <Metric icon={PiggyBank} label="已使用" value={money(totalSpent)} />
      </View>
    </MiaoCard>
  );
}

interface MetricProps {
  icon: typeof PiggyBank;
  label: string;
  value: string;
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Icon color={defaultTheme.primary} size={16} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: defaultTheme.primarySoft,
    gap: 14,
    marginBottom: 14
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  value: {
    color: defaultTheme.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4
  },
  tierRow: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  tierText: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  description: {
    color: defaultTheme.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  metricGrid: {
    flexDirection: "row",
    gap: 10
  },
  metric: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    flex: 1,
    gap: 4,
    minHeight: 78,
    padding: 10
  },
  metricLabel: {
    color: defaultTheme.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  metricValue: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  }
});
