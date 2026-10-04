import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type Props = { label: string; selected?: boolean; onPress: () => void; className?: string };

// A small pill toggle, e.g. a tag filter.
export function CmpChip({ label, selected, onPress, className }: Props) {
  return (
    <Button
      size="sm"
      variant={selected ? "default" : "outline"}
      className={cn("h-8 rounded-full px-3", className)}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}>
      <Text numberOfLines={1}>{label}</Text>
    </Button>
  );
}
