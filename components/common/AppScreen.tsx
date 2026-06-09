import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, type ViewProps } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { defaultTheme } from "@/constants/themes";

interface AppScreenProps extends ViewProps {
  padded?: boolean;
}

export function AppScreen({ children, padded = true, style, ...props }: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        entering={FadeIn.duration(240)}
        exiting={FadeOut.duration(160)}
        style={[styles.content, padded && styles.padded, style]}
        {...props}
      >
        {children}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignItems: "center",
    backgroundColor: defaultTheme.background,
    flex: 1
  },
  content: {
    flex: 1,
    maxWidth: 760,
    width: "100%"
  },
  padded: {
    paddingHorizontal: 18,
    paddingTop: 12
  }
});
