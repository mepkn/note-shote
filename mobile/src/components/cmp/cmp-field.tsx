import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";

type FieldFrameProps = { label?: string; error?: string; hint?: string; children: ReactNode };

export function CmpFieldFrame({ label, error, hint, children }: FieldFrameProps) {
  return (
    <View className="gap-1.5">
      {label && <Label>{label}</Label>}
      {children}
      {error ? (
        <Text className="text-destructive text-sm">{error}</Text>
      ) : hint ? (
        <Text className="text-muted-foreground text-sm">{hint}</Text>
      ) : null}
    </View>
  );
}

export type CmpInputProps = ComponentProps<typeof Input> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function CmpInput({ label, error, hint, className, ...props }: CmpInputProps) {
  return (
    <CmpFieldFrame label={label} error={error} hint={hint}>
      <Input className={error ? `border-destructive ${className ?? ""}` : className} {...props} />
    </CmpFieldFrame>
  );
}

export type CmpTextareaProps = ComponentProps<typeof Textarea> & {
  label?: string;
  error?: string;
};

export function CmpTextarea({ label, error, ...props }: CmpTextareaProps) {
  return (
    <CmpFieldFrame label={label} error={error}>
      <Textarea {...props} />
    </CmpFieldFrame>
  );
}
