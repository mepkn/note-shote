import { usePaginatedQuery, useQuery } from "convex/react";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CmpText } from "@/components/cmp/cmp-text";
import { NoteList, PAGE_SIZE } from "@/components/note-list";
import { strings } from "@/lib/strings";

// Every note with one tag, from Notes, Archive and Trash alike.
export default function TagScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tags = useQuery(api.tags.list);
  const tag = tags?.find((t) => t._id === id);
  const notes = usePaginatedQuery(
    api.notes.byTag,
    tag ? { tagId: tag._id as Id<"tags"> } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerTitle: tag?.name ?? strings.tags.title }} />
      {tags !== undefined && !tag ? (
        <CmpText variant="muted" className="px-4 py-12 text-center">
          {strings.tags.tagNotFound}
        </CmpText>
      ) : (
        <View className="mx-auto w-full max-w-2xl flex-1">
          <NoteList
            results={notes.results}
            status={tag ? notes.status : "LoadingFirstPage"}
            loadMore={notes.loadMore}
            empty={strings.tags.emptyTag}
            contentContainerClassName="gap-2 px-4 pb-10 pt-3"
          />
        </View>
      )}
    </View>
  );
}
