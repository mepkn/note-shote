import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: string;
  placeholder?: string;
  error?: string;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: (value: string) => void;
};

// A dialog with one text field, e.g. for naming a tag.
export function CmpPromptDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {/* Mounted only while open, so the field starts from initialValue each time. */}
      {props.open && <PromptBody {...props} />}
    </Dialog>
  );
}

function PromptBody({
  onOpenChange,
  title,
  initialValue = "",
  placeholder,
  error,
  submitLabel,
  cancelLabel,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue);
  // Width matches the alert dialogs. The dialog rises above the keyboard by itself.
  return (
    <DialogContent className="w-[83vw]">
      <DialogHeader className="text-left">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Input
        autoFocus
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        onSubmitEditing={() => onSubmit(value)}
      />
      {error && <Text className="text-destructive text-sm">{error}</Text>}
      <DialogFooter>
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          <Text>{cancelLabel}</Text>
        </Button>
        <Button disabled={value.trim().length === 0} onPress={() => onSubmit(value)}>
          <Text>{submitLabel}</Text>
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
