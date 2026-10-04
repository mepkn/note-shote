import type { FunctionReturnType } from "convex/server";
import { Pin } from "lucide-react-native";
import { Pressable, View } from "react-native";
import type { api } from "@convex/_generated/api";
import { CmpIcon } from "@/components/cmp/cmp-icon";
import { CmpText } from "@/components/cmp/cmp-text";
import { relativeTime } from "@/lib/format";
import { strings } from "@/lib/strings";

export type NoteSummary = FunctionReturnType<typeof api.notes.pinned>[number];

type Props = {
  note: NoteSummary;
  tagNames: Map<string, string>;
  now: number;
  onPress: () => void;
};

export function NoteRow({ note, tagNames, now, onPress }: Props) {
  const title = note.title || note.fallbackTitle || strings.list.untitled;
  const tags = note.tagIds.map((id) => tagNames.get(id)).filter(Boolean);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      className="border-border bg-card active:bg-muted gap-1 rounded-xl border px-4 py-3 web:hover:bg-muted/60">
      <View className="flex-row items-center gap-2">
        {note.pinned && <CmpIcon as={Pin} size={14} className="text-brand" />}
        <CmpText className="flex-1 text-base font-semibold" numberOfLines={1}>
          {title}
        </CmpText>
        {/* shrink-0: the flex-1 title would otherwise squeeze the time onto a
            hidden second line on Android ("just" instead of "just now"). */}
        <CmpText variant="muted" className="shrink-0 text-xs" numberOfLines={1}>
          {relativeTime(note.updatedAt, now)}
        </CmpText>
      </View>
      {note.preview ? (
        <CmpText variant="muted" className="text-sm" numberOfLines={2}>
          {note.preview}
        </CmpText>
      ) : null}
      {tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 pt-1">
          {tags.map((name) => (
            <View key={name} className="bg-secondary rounded-full px-2 py-0.5">
              <CmpText className="text-secondary-foreground text-xs">{name}</CmpText>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}
