import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { Linking } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { keepLineBreaks } from "@/lib/markdown-compat";
import { markdownStyle } from "@/lib/markdown-style";

// underline: `_x_` means underline, matching what the Android editor writes.
const FLAGS = { underline: true, latexMath: false };
// Without it the web selection highlight is transparent. Primary blue, see-through.
const SELECTION = "hsla(210, 85%, 60%, 0.35)";

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
      markdown={keepLineBreaks(markdown)}
      markdownStyle={style}
      md4cFlags={FLAGS}
      selectionColor={SELECTION}
      enableTaskListItemToggle={false}
      onLinkPress={({ url }) => void Linking.openURL(url)}
    />
  );
}
