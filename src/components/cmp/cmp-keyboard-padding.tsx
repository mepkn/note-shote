import type { ReactNode } from "react";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Fills the space it's given and pads its bottom by the keyboard's height, so
// a full-height editor and its bottom bar sit above the keyboard. Meant for
// a parent that already pads the bottom safe area, which the keyboard covers.
export function CmpKeyboardPadding({ children }: { children: ReactNode }) {
  const { height } = useReanimatedKeyboardAnimation(); // 0 → -keyboard height
  const { bottom } = useSafeAreaInsets();
  const style = useAnimatedStyle(() => ({
    paddingBottom: Math.max(-height.value - bottom, 0),
  }));
  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}
