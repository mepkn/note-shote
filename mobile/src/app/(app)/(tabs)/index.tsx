import { useMutation, usePaginatedQuery } from "convex/react";
import { router } from "expo-router";
import { Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { api } from "@convex/_generated/api";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpConfirmDialog } from "@/components/cmp/cmp-confirm-dialog";
import { CmpSegmented } from "@/components/cmp/cmp-segmented";
import { CmpText } from "@/components/cmp/cmp-text";
import { NoteList, PAGE_SIZE } from "@/components/note-list";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const s = strings.list;

type View_ = "notes" | "archive" | "trash";

const EMPTY: Record<View_, string> = {
  notes: s.emptyNotes,
  archive: s.emptyArchive,
  trash: s.emptyTrash,
};

export default function NoteListScreen() {
  const [view, setView] = useState<View_>("notes");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  // Shows a divider under the filters once the list scrolls beneath them.
  const [scrolled, setScrolled] = useState(false);
  // Pinned notes come first in the Notes view.
  const list = usePaginatedQuery(api.notes.list, { view }, { initialNumItems: PAGE_SIZE });
  const emptyTrash = useMutation(api.notes.emptyTrash);

  return (
    <View className="bg-background flex-1">
      <View className="mx-auto w-full max-w-2xl flex-1">
        <View
          className={cn(
            "gap-3 border-b px-4 pb-3 pt-3",
            scrolled ? "border-border" : "border-transparent",
          )}>
          <CmpSegmented<View_>
            value={view}
            onChange={setView}
            options={(["notes", "archive", "trash"] as const).map((value) => ({
              value,
              label: s.views[value],
            }))}
          />
          {view === "trash" && (
            <View className="flex-row items-center gap-3">
              <CmpText variant="muted" className="flex-1 text-xs">
                {s.trashHint}
              </CmpText>
              <CmpButton
                variant="outline"
                size="sm"
                icon={Trash2}
                tone="destructive"
                label={s.emptyTrashButton}
                disabled={list.results.length === 0}
                onPress={() => setConfirmEmpty(true)}
              />
            </View>
          )}
        </View>

        <NoteList
          results={list.results}
          status={list.status}
          loadMore={list.loadMore}
          empty={EMPTY[view]}
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
        />
      </View>

      {view === "notes" && (
        <View className="absolute bottom-6 right-6" pointerEvents="box-none">
          <CmpButton
            // Icon only; label stays as the accessibility label.
            size="icon"
            icon={Plus}
            label={s.newNote}
            className="size-14 rounded-full shadow-lg shadow-black/20 sm:size-14"
            onPress={() => router.push({ pathname: "/note" })}
          />
        </View>
      )}

      <CmpConfirmDialog
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        title={s.emptyTrashTitle}
        description={s.emptyTrashDescription}
        confirmLabel={s.emptyTrashButton}
        cancelLabel={strings.cancel}
        destructive
        onConfirm={() => void emptyTrash()}
      />
    </View>
  );
}
