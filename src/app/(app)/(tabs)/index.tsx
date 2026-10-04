import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router } from "expo-router";
import { Plus, Search, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpChip } from "@/components/cmp/cmp-chip";
import { CmpConfirmDialog } from "@/components/cmp/cmp-confirm-dialog";
import { CmpInput } from "@/components/cmp/cmp-field";
import { CmpIcon } from "@/components/cmp/cmp-icon";
import { CmpSegmented } from "@/components/cmp/cmp-segmented";
import { CmpText } from "@/components/cmp/cmp-text";
import { NoteRow, type NoteSummary } from "@/components/note-row";
import { useNow } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const s = strings.list;

type View_ = "notes" | "archive" | "trash";

const PAGE_SIZE = 30;
const SEARCH_DELAY_MS = 250;

const EMPTY: Record<View_, string> = {
  notes: s.emptyNotes,
  archive: s.emptyArchive,
  trash: s.emptyTrash,
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function NoteListScreen() {
  const [view, setView] = useState<View_>("notes");
  const [selectedTagId, setTagId] = useState<Id<"tags">>();
  const [query, setQuery] = useState("");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  // Shows a divider under the filters once the list scrolls beneath them.
  const [scrolled, setScrolled] = useState(false);
  const searchText = useDebounced(query.trim(), SEARCH_DELAY_MS);
  const searching = searchText.length > 0;
  const now = useNow();

  const tags = useQuery(api.tags.list);
  // A deleted tag can't stay selected.
  const tagId =
    selectedTagId && tags && !tags.some((t) => t._id === selectedTagId) ? undefined : selectedTagId;
  const pinned = useQuery(api.notes.pinned, view === "notes" && !tagId && !searching ? {} : "skip");
  const list = usePaginatedQuery(
    api.notes.list,
    searching ? "skip" : { view, tagId },
    { initialNumItems: PAGE_SIZE },
  );
  const results = useQuery(api.notes.search, searching ? { query: searchText, view } : "skip");
  const emptyTrash = useMutation(api.notes.emptyTrash);

  const tagNames = useMemo(() => new Map((tags ?? []).map((t) => [t._id, t.name])), [tags]);

  let notes: NoteSummary[] | undefined;
  if (searching) {
    // Search ignores the tag filter on the server; apply it here.
    notes = results?.filter((n) => !tagId || n.tagIds.includes(tagId));
  } else if (list.status === "LoadingFirstPage" || (view === "notes" && !tagId && !pinned)) {
    notes = undefined;
  } else {
    notes = [...(view === "notes" && !tagId ? (pinned ?? []) : []), ...list.results];
  }

  const open = (id?: string) =>
    router.push(id ? { pathname: "/note", params: { id } } : { pathname: "/note" });

  return (
    <View className="bg-background flex-1">
      <View className="mx-auto w-full max-w-2xl flex-1">
        <View
          className={cn(
            "gap-3 border-b px-4 pb-3 pt-3",
            scrolled ? "border-border" : "border-transparent",
          )}>
          <View className="relative justify-center">
            <View className="absolute left-3 z-10" pointerEvents="none">
              <CmpIcon as={Search} size={16} className="text-muted-foreground" />
            </View>
            <CmpInput
              value={query}
              onChangeText={setQuery}
              placeholder={s.search}
              className="pl-9"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={s.search}
            />
          </View>
          <CmpSegmented<View_>
            value={view}
            onChange={setView}
            options={(["notes", "archive", "trash"] as const).map((value) => ({
              value,
              label: s.views[value],
            }))}
          />
          {tags && tags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
              keyboardShouldPersistTaps="handled">
              <CmpChip label={s.allTags} selected={!tagId} onPress={() => setTagId(undefined)} />
              {tags.map((tag) => (
                <CmpChip
                  key={tag._id}
                  label={tag.name}
                  selected={tag._id === tagId}
                  onPress={() => setTagId(tag._id === tagId ? undefined : tag._id)}
                />
              ))}
            </ScrollView>
          )}
          {view === "trash" && !searching && (
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
                disabled={!notes || notes.length === 0}
                onPress={() => setConfirmEmpty(true)}
              />
            </View>
          )}
        </View>

        {notes === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(n) => n._id}
            contentContainerClassName="gap-2 px-4 pb-28 pt-1"
            onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
            scrollEventThrottle={32}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <NoteRow note={item} tagNames={tagNames} now={now} onPress={() => open(item._id)} />
            )}
            ListEmptyComponent={
              <CmpText variant="muted" className="py-12 text-center">
                {searching ? s.noResults : EMPTY[view]}
              </CmpText>
            }
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (!searching && list.status === "CanLoadMore") list.loadMore(PAGE_SIZE);
            }}
            ListFooterComponent={
              !searching && list.status === "LoadingMore" ? <ActivityIndicator /> : null
            }
          />
        )}
      </View>

      {view === "notes" && (
        <View className="absolute bottom-6 right-6" pointerEvents="box-none">
          <CmpButton
            // Icon only; label stays as the accessibility label.
            size="icon"
            icon={Plus}
            label={s.newNote}
            className="size-14 rounded-full shadow-lg shadow-black/20"
            onPress={() => open()}
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
