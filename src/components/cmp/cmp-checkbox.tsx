import { Checkbox } from "@/components/ui/checkbox";
import type { ComponentProps } from "react";

export function CmpCheckbox(props: ComponentProps<typeof Checkbox>) {
  return <Checkbox {...props} />;
}
