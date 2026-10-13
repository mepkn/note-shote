import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_TAG_NAME_CHARS } from "@convex/lib/limits";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpCheckbox } from "@/components/cmp/cmp-checkbox";
import { CmpDialog } from "@/components/cmp/cmp-dialog";
import { CmpInput } from "@/components/cmp/cmp-field";
import { CmpText } from "@/components/cmp/cmp-text";
import { errorMessage } from "@/lib/errors";
import { strings } from "@/lib/strings";

const s = strings.tags;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Id<"tags">[];
  onChange: (tagIds: Id<"tags">[]) => Promise<unknown>;
};

// Picks a note's tags; new tags are created inline and selected straight away.
export function TagPicker({ open, onOpenChange, selected, onChange }: Props) {
  const tags = useQuery(api.tags.list, open ? {} : "skip");
  const createTag = useMutation(api.tags.create);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  async function run(task: () => Promise<unknown>) {
    setError(undefined);
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function toggle(id: Id<"tags">) {
    const next = selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id];
    void run(() => onChange(next));
  }

  function add() {
    if (!name.trim()) return;
    void run(async () => {
      const id = await createTag({ name });
      setName("");
      await onChange([...selected, id]);
    });
  }

  return (
    <CmpDialog open={open} onOpenChange={onOpenChange} title={s.title}>
      <ScrollView className="max-h-80" keyboardShouldPersistTaps="handled">
        {tags?.length === 0 && <CmpText variant="muted">{s.none}</CmpText>}
        {tags?.map((tag) => (
          <Pressable
            key={tag._id}
            onPress={() => toggle(tag._id)}
            className="flex-row items-center gap-3 py-2"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected.includes(tag._id) }}>
            <CmpCheckbox checked={selected.includes(tag._id)} onCheckedChange={() => toggle(tag._id)} />
            <CmpText className="flex-1" numberOfLines={1}>
              {tag.name}
            </CmpText>
          </Pressable>
        ))}
      </ScrollView>
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <CmpInput
            value={name}
            onChangeText={setName}
            placeholder={s.newTagPlaceholder}
            maxLength={MAX_TAG_NAME_CHARS}
            onSubmitEditing={add}
            returnKeyType="done"
          />
        </View>
        <CmpButton variant="outline" icon={Plus} label={s.add} disabled={!name.trim()} onPress={add} />
      </View>
      {error && <CmpText className="text-destructive text-sm">{error}</CmpText>}
      <CmpButton label={s.done} onPress={() => onOpenChange(false)} />
    </CmpDialog>
  );
}
