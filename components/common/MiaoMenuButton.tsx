import { router } from "expo-router";
import { Image, StyleSheet } from "react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";

const menuSticker = require("../../assets/images/miao-menu-sticker.png");

export function MiaoMenuButton() {
  return (
    <AnimatedPressable
      accessibilityLabel="快捷菜单"
      accessibilityRole="button"
      hoverScale={1.04}
      onPress={() => router.push("/menu" as never)}
      pressedScale={0.94}
      style={styles.button}
    >
      <Image source={menuSticker} style={styles.image} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    height: 78,
    overflow: "hidden",
    shadowColor: "#8BC8F4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 78
  },
  image: {
    height: "100%",
    resizeMode: "cover",
    width: "100%"
  }
});
