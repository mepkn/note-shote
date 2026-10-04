import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// Android draws edge-to-edge, so the window no longer shrinks for the soft
// keyboard and KeyboardAvoidingView doesn't move content. This returns the
// keyboard height to pad the screen by (0 elsewhere).
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => setInset(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}
