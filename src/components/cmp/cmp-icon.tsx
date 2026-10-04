import { Icon } from "@/components/ui/icon";
import type { ComponentProps } from "react";

export type CmpIconProps = ComponentProps<typeof Icon>;

export function CmpIcon({ size = 18, ...props }: CmpIconProps) {
  return <Icon size={size} {...props} />;
}
