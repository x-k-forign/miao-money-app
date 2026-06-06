import { StyleSheet, View, type ViewProps } from "react-native";
import { defaultTheme } from "@/constants/themes";

export function MiaoCard({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: defaultTheme.card,
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    padding: 16,
    shadowColor: "#8CCFEB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18
  }
});
