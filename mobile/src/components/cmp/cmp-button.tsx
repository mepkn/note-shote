import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { LucideIcon } from "lucide-react-native";
import type { ComponentProps } from "react";
import { ActivityIndicator } from "react-native";
import { CmpIcon } from "./cmp-icon";

export type CmpButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  label?: string;
  icon?: LucideIcon;
  loading?: boolean;
  // Colours the label and icon for destructive actions on non-destructive variants.
  tone?: "default" | "destructive";
};

export function CmpButton({ label, icon, loading, disabled, tone, ...props }: CmpButtonProps) {
  const toneClass = tone === "destructive" ? "text-destructive" : undefined;
  return (
    <Button disabled={disabled || loading} accessibilityLabel={label} {...props}>
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        icon && <CmpIcon as={icon} size={props.size === "icon" ? 20 : 16} className={toneClass} />
      )}
      {label !== undefined && props.size !== "icon" && <Text className={toneClass}>{label}</Text>}
    </Button>
  );
}
