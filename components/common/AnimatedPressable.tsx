import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  hoverScale?: number;
  pressedScale?: number;
}

export function AnimatedPressable({
  hoverScale = 1.02,
  onHoverIn,
  onHoverOut,
  onPressIn,
  onPressOut,
  pressedScale = 0.96,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const hovered = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedPressableBase
      {...props}
      onHoverIn={(event) => {
        hovered.value = true;
        scale.value = withSpring(hoverScale, { damping: 16, stiffness: 220 });
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        hovered.value = false;
        scale.value = withSpring(1, { damping: 16, stiffness: 220 });
        onHoverOut?.(event);
      }}
      onPressIn={(event) => {
        scale.value = withSpring(pressedScale, { damping: 18, stiffness: 260 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(hovered.value ? hoverScale : 1, { damping: 14, stiffness: 220 });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
