import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import type { ComponentProps } from "react";

export type CmpBadgeProps = Omit<ComponentProps<typeof Badge>, "children"> & { label: string };

export function CmpBadge({ label, ...props }: CmpBadgeProps) {
  return (
    <Badge {...props}>
      <Text>{label}</Text>
    </Badge>
  );
}
