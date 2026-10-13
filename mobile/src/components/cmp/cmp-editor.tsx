import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Platform, TextInput } from "react-native";

export type CmpEditorProps = ComponentProps<typeof TextInput>;

const MONO = Platform.select({
  web: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  default: "monospace",
});

// A full-height, borderless, monospace plain-text area.
export function CmpEditor({ className, style, ...props }: CmpEditorProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      className={cn(
        "text-foreground bg-background flex-1 px-4 py-3 text-base leading-6",
        Platform.select({ web: "placeholder:text-muted-foreground outline-none" }),
        className,
      )}
      placeholderClassName="text-muted-foreground"
      style={[{ fontFamily: MONO }, style]}
      {...props}
    />
  );
}
