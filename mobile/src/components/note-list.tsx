import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, View, type FlatListProps } from "react-native";
import { api } from "@convex/_generated/api";
import { CmpText } from "@/components/cmp/cmp-text";
import { NoteRow, type NoteSummary } from "@/components/note-row";
import { useNow } from "@/lib/format";

export const PAGE_SIZE = 30;

type Props = {
  // From usePaginatedQuery.
  results: NoteSummary[];
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (n: number) => void;
  empty: string;
} & Pick<FlatListProps<NoteSummary>, "onScroll" | "contentContainerClassName">;

// A paginated list of note rows that loads the next page on scroll.
export function NoteList({ results, status, loadMore, empty, ...rest }: Props) {
  const now = useNow();
  const tags = useQuery(api.tags.list);
  const tagNames = useMemo(() => new Map((tags ?? []).map((t) => [t._id, t.name])), [tags]);

  if (status === "LoadingFirstPage") {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <FlatList
      data={results}
      keyExtractor={(n) => n._id}
      contentContainerClassName="gap-2 px-4 pb-28 pt-1"
      scrollEventThrottle={32}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...rest}
      renderItem={({ item }) => (
        <NoteRow
          note={item}
          tagNames={tagNames}
          now={now}
          onPress={() => router.push({ pathname: "/note", params: { id: item._id } })}
        />
      )}
      ListEmptyComponent={
        <CmpText variant="muted" className="py-12 text-center">
          {empty}
        </CmpText>
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => status === "CanLoadMore" && loadMore(PAGE_SIZE)}
      ListFooterComponent={status === "LoadingMore" ? <ActivityIndicator /> : null}
    />
  );
}
