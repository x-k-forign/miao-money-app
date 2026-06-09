import { router, Tabs } from "expo-router";
import { BarChart3, FileText, PiggyBank, Plus, Repeat } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";

const iconSize = 22;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(0, insets.bottom);

  return (
    <Tabs
      screenOptions={{
        animation: "fade",
        headerShown: false,
        tabBarActiveTintColor: defaultTheme.primary,
        tabBarInactiveTintColor: defaultTheme.muted,
        tabBarIconStyle: styles.tabIcon,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 78 + bottomInset,
            paddingBottom: Math.max(14, bottomInset + 4)
          }
        ]
      }}
    >
      <Tabs.Screen
        name="bills"
        options={{
          title: "我的账单",
          tabBarIcon: ({ color }) => <FileText color={color} size={iconSize} />
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "收支分析",
          tabBarIcon: ({ color }) => <BarChart3 color={color} size={iconSize} />
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: () => (
            <AnimatedPressable
              accessibilityLabel="添加收支"
              onPress={() => router.push("/record/new")}
              pressedScale={0.9}
              style={[styles.addButton, { bottom: 20 + bottomInset }]}
            >
              <Plus color="#FFFFFF" size={30} strokeWidth={3} />
            </AnimatedPressable>
          )
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "预算分配",
          tabBarIcon: ({ color }) => <PiggyBank color={color} size={iconSize} />
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "订阅管理",
          tabBarIcon: ({ color }) => <Repeat color={color} size={iconSize} />
        }}
      />
      <Tabs.Screen name="exchange" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#DFF3FF",
    paddingTop: 10,
    position: "relative",
    shadowColor: "#8CCFEB",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 14
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    minHeight: 16
  },
  tabIcon: {
    marginBottom: 2,
    marginTop: 2
  },
  tabItem: {
    justifyContent: "center",
    minHeight: 54,
    paddingVertical: 4
  },
  addButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderColor: "#FFFFFF",
    borderRadius: 31,
    borderWidth: 5,
    height: 62,
    justifyContent: "center",
    left: "50%",
    marginLeft: -31,
    position: "absolute",
    shadowColor: "#64BDEB",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    width: 62
  }
});
