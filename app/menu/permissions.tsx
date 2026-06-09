import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ArrowLeft, Bell, ChevronRight, Settings2 } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { MiaoCard } from "@/components/common/MiaoCard";
import { PageHeader } from "@/components/common/PageHeader";
import { defaultTheme } from "@/constants/themes";
import {
  ensureNotificationPermission,
  getNotificationPermissionState,
  type NotificationPermissionState
} from "@/services/notificationService";

export default function PermissionManagementScreen() {
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshPermission = useCallback(() => {
    getNotificationPermissionState()
      .then(setPermission)
      .catch((error) => {
        console.warn("Load permission state failed", error);
      });
  }, []);

  useFocusEffect(refreshPermission);

  async function requestPermission() {
    if (Platform.OS === "web") {
      return;
    }

    setLoading(true);
    try {
      const granted = await ensureNotificationPermission();
      refreshPermission();
      if (!granted) {
        Alert.alert("未开启通知权限", "如果系统不再弹出授权窗口，请在手机系统设置里允许本应用发送通知。");
      }
    } finally {
      setLoading(false);
    }
  }

  async function openSystemSettings() {
    if (Platform.OS === "web") {
      return;
    }

    await Linking.openSettings();
  }

  const granted = permission?.granted === true;
  const unsupported = permission?.supported === false;

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageHeader title="权限管理" subtitle="管理订阅提醒需要的本地通知权限" compact showMenu={false} />

        <Animated.View entering={FadeInUp.delay(40).duration(260)}>
          <MiaoCard style={styles.card}>
            <View style={styles.permissionTop}>
              <View style={[styles.permissionIcon, granted && styles.permissionIconOn]}>
                <Bell color={granted ? "#FFFFFF" : defaultTheme.primary} size={24} />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>订阅提醒通知</Text>
                <Text style={styles.permissionSubtitle}>
                  {unsupported ? "当前平台不支持本地通知" : granted ? "已开启，订阅到期前会按设置提醒" : "未开启，订阅提醒不会弹出"}
                </Text>
              </View>
              <View style={[styles.statusPill, granted && styles.statusPillOn]}>
                <Text style={[styles.statusText, granted && styles.statusTextOn]}>{granted ? "已开启" : "未开启"}</Text>
              </View>
            </View>

            <AnimatedPressable
              accessibilityRole="button"
              disabled={loading || unsupported || granted}
              onPress={requestPermission}
              style={[styles.primaryButton, (loading || unsupported || granted) && styles.disabledButton]}
            >
              <Text style={styles.primaryText}>{loading ? "正在请求..." : granted ? "通知权限已开启" : "请求通知权限"}</Text>
            </AnimatedPressable>
          </MiaoCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).duration(260)}>
          <MiaoCard style={styles.card}>
            <AnimatedPressable accessibilityRole="button" onPress={openSystemSettings} style={styles.settingsRow}>
              <View style={styles.settingsIcon}>
                <Settings2 color={defaultTheme.primary} size={20} />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>打开系统设置</Text>
                <Text style={styles.permissionSubtitle}>系统拒绝后，需要在手机设置里重新允许通知。</Text>
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
  card: {
    gap: 14,
    marginBottom: 14
  },
  permissionTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  permissionIconOn: {
    backgroundColor: defaultTheme.primary
  },
  permissionText: {
    flex: 1,
    gap: 4
  },
  permissionTitle: {
    color: defaultTheme.text,
    fontSize: 16,
    fontWeight: "900"
  },
  permissionSubtitle: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 18
  },
  statusPill: {
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusPillOn: {
    backgroundColor: "#DDF8EE"
  },
  statusText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  statusTextOn: {
    color: "#339C77"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48
  },
  disabledButton: {
    opacity: 0.58
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 68
  },
  settingsIcon: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  backButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  backText: {
    color: defaultTheme.muted,
    fontSize: 14,
    fontWeight: "900"
  }
});
