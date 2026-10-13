import { usePaginatedQuery } from "convex/react";
import { useFocusEffect } from "expo-router";
import { Search } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { type TextInput, View } from "react-native";
import { api } from "@convex/_generated/api";
import { CmpInput } from "@/components/cmp/cmp-field";
import { CmpIcon } from "@/components/cmp/cmp-icon";
import { CmpText } from "@/components/cmp/cmp-text";
import { NoteList, PAGE_SIZE } from "@/components/note-list";
import { strings } from "@/lib/strings";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";

const s = strings.list;
const SEARCH_DELAY_MS = 250;

// Searches every note on the server, Archive and Trash included. The query
// stays while the app is open (tab screens stay mounted).
export default function SearchScreen() {
  const input = useRef<TextInput>(null);
  const [text, setText] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const query = useDebounced(text.trim(), SEARCH_DELAY_MS);

  // Opening the tab puts the cursor in the box.
  useFocusEffect(
    useCallback(() => {
      input.current?.focus();
    }, []),
  );

  const results = usePaginatedQuery(api.notes.search, query ? { query } : "skip", {
    initialNumItems: PAGE_SIZE,
  });

  return (
    <View className="bg-background flex-1">
      <View className="mx-auto w-full max-w-2xl flex-1">
        <View
          className={cn(
            "border-b px-4 pb-3 pt-3",
            scrolled ? "border-border" : "border-transparent",
          )}>
          <View className="relative justify-center">
            <View className="absolute left-3 z-10" pointerEvents="none">
              <CmpIcon as={Search} size={16} className="text-muted-foreground" />
            </View>
            <CmpInput
              ref={input}
              value={text}
              onChangeText={setText}
              placeholder={s.search}
              className="pl-9"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={s.search}
            />
          </View>
        </View>
        {query ? (
          <NoteList
            results={results.results}
            status={results.status}
            loadMore={results.loadMore}
            empty={s.noResults}
            contentContainerClassName="gap-2 px-4 pb-10 pt-1"
            onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
          />
        ) : (
          <CmpText variant="muted" className="px-4 py-12 text-center">
            {s.searchHint}
          </CmpText>
        )}
      </View>
    </View>
  );
}
