import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ArrowLeft, Bell, ChevronRight, Coins } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { MiaoCard } from "@/components/common/MiaoCard";
import { PageHeader } from "@/components/common/PageHeader";
import { defaultTheme } from "@/constants/themes";

export default function MenuScreen() {
  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageHeader title="快捷菜单" subtitle="常用工具集中放在这里，后续入口样式可直接替换" compact showMenu={false} />

        <Animated.View entering={FadeInUp.delay(40).duration(260)}>
          <MiaoCard style={styles.menuCard}>
            <AnimatedPressable accessibilityRole="button" onPress={() => router.push("/exchange" as never)} style={styles.menuRow}>
              <View style={styles.menuIcon}>
                <Coins color={defaultTheme.primary} size={22} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>汇率计算</Text>
                <Text style={styles.menuSubtitle}>常见币种换算和缓存汇率查看</Text>
              </View>
              <ChevronRight color={defaultTheme.muted} size={20} />
            </AnimatedPressable>
          </MiaoCard>
        </Animated.View>

        <Text style={styles.groupTitle}>次要功能</Text>
        <Animated.View entering={FadeInUp.delay(80).duration(260)}>
          <MiaoCard style={styles.menuCard}>
            <AnimatedPressable accessibilityRole="button" onPress={() => router.push("/menu/permissions" as never)} style={styles.menuRow}>
              <View style={styles.menuIcon}>
                <Bell color={defaultTheme.primary} size={22} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>权限管理</Text>
                <Text style={styles.menuSubtitle}>查看并开启订阅提醒所需的通知权限</Text>
              </View>
              <ChevronRight color={defaultTheme.muted} size={20} />
            </AnimatedPressable>
          </MiaoCard>
        </Animated.View>

        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={defaultTheme.muted} size={18} />
          <Text style={styles.backText}>返回</Text>
        </AnimatedPressable>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 36
  },
  menuCard: {
    padding: 10
  },
  groupTitle: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 18
  },
  menuRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 10
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  menuText: {
    flex: 1,
    gap: 3
  },
  menuTitle: {
    color: defaultTheme.text,
    fontSize: 16,
    fontWeight: "900"
  },
  menuSubtitle: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 17
  },
  backButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  backText: {
    color: defaultTheme.muted,
    fontSize: 14,
    fontWeight: "900"
  }
});
