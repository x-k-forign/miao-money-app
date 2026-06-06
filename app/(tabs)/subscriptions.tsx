import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Bell, CalendarClock, Edit3, Plus, Trash2 } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { MiaoCard } from "@/components/common/MiaoCard";
import { PageHeader } from "@/components/common/PageHeader";
import { defaultTheme } from "@/constants/themes";
import { deleteSubscriptionById, getSubscriptions, toggleSubscriptionEnabled } from "@/services/subscriptionService";
import { useRecordStore } from "@/stores/useRecordStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import type { SubscriptionDTO } from "@/types/models";
import { centsToYuan } from "@/utils/money";

function money(cents: number) {
  return `¥${centsToYuan(cents)}`;
}

export default function SubscriptionsScreen() {
  const { refreshKey, requestRefresh } = useSubscriptionStore();
  const requestRecordRefresh = useRecordStore((state) => state.requestRefresh);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([]);

  useEffect(() => {
    let mounted = true;

    getSubscriptions()
      .then((nextSubscriptions) => {
        if (mounted) {
          setSubscriptions(nextSubscriptions);
        }
      })
      .catch((error) => {
        console.warn("Load subscriptions failed", error);
        if (mounted) {
          setSubscriptions([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const nextItems = useMemo(
    () => subscriptions.filter((item) => item.enabled).sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [subscriptions]
  );

  async function toggleEnabled(id: string, enabled: boolean) {
    await toggleSubscriptionEnabled(id, enabled);
    requestRecordRefresh();
    requestRefresh();
  }

  async function removeSubscription(id: string) {
    await deleteSubscriptionById(id);
    requestRecordRefresh();
    requestRefresh();
  }

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageHeader title="订阅管理" subtitle="固定收入和固定支出，每月只自动生成一次" />

        <Animated.View entering={FadeInUp.delay(40).duration(260)}>
          <MiaoCard style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <CalendarClock color={defaultTheme.primary} size={28} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>本月待生成 {nextItems.length} 项</Text>
              <Text style={styles.heroSubtitle}>
                下一项：{nextItems[0]?.name ?? "暂无"} · 每月 {nextItems[0]?.dayOfMonth ?? "-"} 号
              </Text>
            </View>
            <Link href="/subscription/new" asChild>
              <AnimatedPressable accessibilityLabel="添加订阅" style={styles.addSmallButton}>
                <Plus color="#FFFFFF" size={20} strokeWidth={3} />
              </AnimatedPressable>
            </Link>
          </MiaoCard>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>订阅列表</Text>
          <Text style={styles.sectionMeta}>{subscriptions.length} 项</Text>
        </View>

        {subscriptions.map((item, index) => (
          <Animated.View key={item.id} entering={FadeInUp.delay(90 + index * 45).duration(260)}>
            <MiaoCard style={[styles.subscriptionCard, !item.enabled && styles.disabledCard]}>
              <View style={styles.subscriptionTop}>
                <CategoryIcon color={item.categoryColor} name={item.categoryIcon} />
                <View style={styles.subscriptionText}>
                  <View style={styles.titleRow}>
                    <Text style={styles.subscriptionName}>{item.name}</Text>
                    <View style={[styles.typeTag, item.type === "income" ? styles.incomeTag : styles.expenseTag]}>
                      <Text style={styles.typeTagText}>{item.type === "income" ? "收入" : "支出"}</Text>
                    </View>
                  </View>
                  <Text style={styles.subscriptionNote} numberOfLines={1}>{item.note}</Text>
                </View>
                <Text style={[styles.amount, item.type === "income" ? styles.income : styles.expense]}>
                  {item.type === "income" ? "+" : "-"}
                  {money(item.amountCents)}
                </Text>
              </View>

              <View style={styles.subscriptionMeta}>
                <View style={styles.metaPill}>
                  <CalendarClock color={defaultTheme.primary} size={14} />
                  <Text style={styles.metaText}>每月 {item.dayOfMonth} 号</Text>
                </View>
                <View style={styles.actions}>
                  <AnimatedPressable
                    accessibilityLabel={item.enabled ? "关闭订阅" : "启用订阅"}
                    onPress={() => toggleEnabled(item.id, !item.enabled)}
                    style={[styles.toggle, item.enabled && styles.toggleOn]}
                  >
                    <View style={[styles.toggleKnob, item.enabled && styles.toggleKnobOn]} />
                  </AnimatedPressable>
                  <Link href={`/subscription/${item.id}/edit`} asChild>
                    <AnimatedPressable accessibilityLabel="编辑订阅" style={styles.iconButton}>
                      <Edit3 color={defaultTheme.primary} size={16} />
                    </AnimatedPressable>
                  </Link>
                  <AnimatedPressable
                    accessibilityLabel="删除订阅"
                    onPress={() => removeSubscription(item.id)}
                    style={styles.iconButton}
                  >
                    <Trash2 color={defaultTheme.pink} size={16} />
                  </AnimatedPressable>
                </View>
              </View>
            </MiaoCard>
          </Animated.View>
        ))}

        <MiaoCard style={styles.reminderCard}>
          <Bell color={defaultTheme.pink} size={20} />
          <View style={styles.reminderText}>
            <Text style={styles.reminderTitle}>提醒功能已预留</Text>
            <Text style={styles.reminderBody}>后续可添加提前几天提醒、提醒时间和同月只提醒一次。</Text>
          </View>
        </MiaoCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 110
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  heroText: {
    flex: 1,
    gap: 4
  },
  heroTitle: {
    color: defaultTheme.text,
    fontSize: 17,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  addSmallButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
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
  subscriptionCard: {
    gap: 13,
    marginBottom: 12
  },
  disabledCard: {
    opacity: 0.62
  },
  subscriptionTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  subscriptionText: {
    flex: 1,
    gap: 4
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  subscriptionName: {
    color: defaultTheme.text,
    fontSize: 15,
    fontWeight: "900"
  },
  typeTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  incomeTag: {
    backgroundColor: "#DDF8EE"
  },
  expenseTag: {
    backgroundColor: "#FFE4EF"
  },
  typeTagText: {
    color: defaultTheme.text,
    fontSize: 11,
    fontWeight: "900"
  },
  subscriptionNote: {
    color: defaultTheme.muted,
    fontSize: 12
  },
  amount: {
    fontSize: 15,
    fontWeight: "900"
  },
  income: {
    color: "#42B992"
  },
  expense: {
    color: "#F07FA4"
  },
  subscriptionMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  metaPill: {
    alignItems: "center",
    backgroundColor: "#F2FAFF",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  metaText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
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
  iconButton: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  reminderCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 4
  },
  reminderText: {
    flex: 1,
    gap: 3
  },
  reminderTitle: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  reminderBody: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 17
  }
});
