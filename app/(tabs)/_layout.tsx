import { Link, Tabs } from "expo-router";
import { BarChart3, Calculator, FileText, Plus, Repeat } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";

const iconSize = 22;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        animation: "fade",
        headerShown: false,
        tabBarActiveTintColor: defaultTheme.primary,
        tabBarInactiveTintColor: defaultTheme.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar
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
            <Link href="/record/new" asChild>
              <AnimatedPressable accessibilityLabel="添加收支" pressedScale={0.9} style={styles.addButton}>
                <Plus color="#FFFFFF" size={30} strokeWidth={3} />
              </AnimatedPressable>
            </Link>
          )
        }}
      />
      <Tabs.Screen
        name="exchange"
        options={{
          title: "汇率计算",
          tabBarIcon: ({ color }) => <Calculator color={color} size={iconSize} />
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "订阅管理",
          tabBarIcon: ({ color }) => <Repeat color={color} size={iconSize} />
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#DFF3FF",
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
    position: "relative",
    shadowColor: "#8CCFEB",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 14
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "800"
  },
  addButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderColor: "#FFFFFF",
    borderRadius: 31,
    borderWidth: 5,
    bottom: 18,
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
