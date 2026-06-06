import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { defaultTheme } from "@/constants/themes";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";

export default function RootLayout() {
  const ready = useAppBootstrap();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <MiaoLoader label="正在准备本地账本..." />
      </View>
    );
  }

  return (
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
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: defaultTheme.background,
    flex: 1,
    justifyContent: "center"
  }
});
