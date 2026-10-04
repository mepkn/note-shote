import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { View } from "react-native";

type Props<T extends string> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
};

// A row of mutually exclusive choices built from Button.
export function CmpSegmented<T extends string>({ value, options, onChange, className }: Props<T>) {
  return (
    <View className={cn("bg-muted flex-row gap-1 rounded-lg p-1", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Button
            key={o.value}
            size="sm"
            variant={selected ? "default" : "ghost"}
            className="flex-1"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}>
            <Text numberOfLines={1}>{o.label}</Text>
          </Button>
        );
      })}
    </View>
  );
}
