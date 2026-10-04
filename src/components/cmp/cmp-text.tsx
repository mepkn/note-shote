import { Text } from "@/components/ui/text";
import type { ComponentProps } from "react";

export type CmpTextProps = ComponentProps<typeof Text>;

export function CmpText(props: CmpTextProps) {
  return <Text {...props} />;
}
