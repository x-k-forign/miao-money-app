import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { defaultTheme } from "@/constants/themes";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import { ensureNotificationPermission, getNotificationPermissionState } from "@/services/notificationService";

export default function RootLayout() {
  const { error, ready, retry } = useAppBootstrap();
  const promptedForPermissions = useRef(false);

  useEffect(() => {
    if (!ready || Platform.OS === "web" || promptedForPermissions.current) {
      return;
    }

    let mounted = true;
    promptedForPermissions.current = true;

    const timer = setTimeout(() => {
      getNotificationPermissionState()
        .then((permission) => {
          if (!mounted || !permission.supported || permission.granted) {
            return;
          }

          Alert.alert("开启提醒权限", "订阅到期提醒需要通知权限。不开启也能记账，但订阅提醒不会弹出。", [
            { style: "cancel", text: "暂不开启" },
            {
              text: permission.canAskAgain === false ? "去权限管理" : "允许通知",
              onPress: async () => {
                if (permission.canAskAgain === false) {
                  router.push("/menu/permissions" as never);
                  return;
                }

                await ensureNotificationPermission();
              }
            }
          ]);
        })
        .catch((error) => {
          console.warn("Check notification permission failed", error);
        });
    }, 600);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [ready]);

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorTitle}>本地账本升级失败</Text>
        <Text style={styles.errorMessage}>已有账单不会被删除。请重新尝试完成数据库升级。</Text>
        <Text selectable style={styles.errorDetail}>
          {error}
        </Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryText}>重新尝试</Text>
        </Pressable>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.loading}>
        <MiaoLoader label="正在准备本地账本..." />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: defaultTheme.background },
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="record/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="record/[id]/edit" options={{ presentation: "modal" }} />
        <Stack.Screen name="subscription/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="subscription/[id]/edit" options={{ presentation: "modal" }} />
        <Stack.Screen name="import/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="import/preview" options={{ presentation: "modal" }} />
        <Stack.Screen name="menu/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="menu/exchange" options={{ presentation: "modal" }} />
        <Stack.Screen name="menu/permissions" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: defaultTheme.background,
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  errorTitle: {
    color: defaultTheme.text,
    fontSize: 22,
    fontWeight: "900"
  },
  errorMessage: {
    color: defaultTheme.muted,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: "center"
  },
  errorDetail: {
    color: defaultTheme.muted,
    fontSize: 11,
    maxWidth: 320,
    textAlign: "center"
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    minWidth: 160,
    paddingHorizontal: 24,
    paddingVertical: 13
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
