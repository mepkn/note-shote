import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { Linking } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { markdownStyle } from "@/lib/markdown-style";

// underline: `_x_` means underline, matching what the Android editor writes.
const FLAGS = { underline: true, latexMath: false };

// Read-only rendered Markdown (GFM) on Android and web.
export function CmpMarkdown({ markdown }: { markdown: string }) {
  const { colorScheme } = useColorScheme();
  const style = useMemo(
    () => markdownStyle(colorScheme === "dark" ? "dark" : "light"),
    [colorScheme],
  );
  return (
    <EnrichedMarkdownText
      flavor="github"
      testID="markdown"
      markdown={markdown}
      markdownStyle={style}
      md4cFlags={FLAGS}
      enableTaskListItemToggle={false}
      onLinkPress={({ url }) => void Linking.openURL(url)}
    />
  );
}
