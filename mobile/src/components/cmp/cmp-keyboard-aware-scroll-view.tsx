import { cssInterop } from "nativewind";
import type { Ref } from "react";
import type { ScrollView } from "react-native";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

const StyledKeyboardAwareScrollView = cssInterop(KeyboardAwareScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
}) as React.ComponentType<
  KeyboardAwareScrollViewProps & { className?: string; contentContainerClassName?: string }
>;

type Props = React.ComponentProps<typeof StyledKeyboardAwareScrollView> & {
  ref?: Ref<ScrollView>;
};

// A ScrollView that scrolls the focused field above the keyboard. For form
// screens; lists and full-height editors don't use it.
export function CmpKeyboardAwareScrollView({
  bottomOffset = 24,
  keyboardShouldPersistTaps = "handled",
  className = "flex-1",
  ...props
}: Props) {
  return (
    <StyledKeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      className={className}
      {...props}
    />
  );
}
