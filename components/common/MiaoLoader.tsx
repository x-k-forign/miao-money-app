import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { defaultTheme } from "@/constants/themes";

interface MiaoLoaderProps {
  label?: string;
}

export function MiaoLoader({ label = "正在整理小账本..." }: MiaoLoaderProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [progress]);

  const walletStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -8]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-4, 4])}deg` }
    ]
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.35, 1, 0.35]),
    transform: [{ scale: interpolate(progress.value, [0, 0.5, 1], [0.86, 1.12, 0.86]) }]
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.wallet, walletStyle]}>
        <View style={styles.walletFlap} />
        <View style={styles.walletDot} />
      </Animated.View>
      <View style={styles.dots}>
        {[0, 1, 2].map((item) => (
          <Animated.View
            key={item}
            style={[
              styles.dot,
              dotStyle,
              { backgroundColor: item === 1 ? defaultTheme.pink : defaultTheme.primary }
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center"
  },
  wallet: {
    backgroundColor: defaultTheme.primary,
    borderColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 3,
    height: 54,
    justifyContent: "center",
    shadowColor: "#72C8F3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    width: 70
  },
  walletFlap: {
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 6,
    height: 20,
    marginLeft: 8,
    width: 46
  },
  walletDot: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    height: 8,
    position: "absolute",
    right: 13,
    top: 23,
    width: 8
  },
  dots: {
    flexDirection: "row",
    gap: 8
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10
  },
  label: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "800"
  }
});
