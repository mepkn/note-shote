import { useRef, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import {
  EnrichedMarkdownTextInput,
  type EnrichedMarkdownTextInputInstance,
} from "react-native-enriched-markdown";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpText } from "@/components/cmp/cmp-text";
import { canEditRich } from "@/lib/markdown-compat";
import { ROUNDTRIP_SAMPLE } from "@/lib/roundtrip-sample";

// Dev-only: loads every GFM feature into the Android editor, serializes it back
// and shows both, line by line. Open /roundtrip in a development build.
export default function RoundtripScreen() {
  const ref = useRef<EnrichedMarkdownTextInputInstance>(null);
  const [out, setOut] = useState<string>();
  if (!__DEV__ || Platform.OS === "web") return null;
  const a = ROUNDTRIP_SAMPLE.split("\n");
  const b = out?.split("\n") ?? [];
  return (
    <ScrollView contentContainerClassName="gap-3 p-4">
      <View className="h-64 border">
        <EnrichedMarkdownTextInput ref={ref} defaultValue={ROUNDTRIP_SAMPLE} style={{ flex: 1 }} />
      </View>
      <CmpButton
        label="Serialize"
        onPress={async () => {
          const md = (await ref.current?.getMarkdown()) ?? "";
          console.log("ROUNDTRIP\n" + md);
          setOut(md);
        }}
      />
      <CmpText>canEditRich(sample) = {String(canEditRich(ROUNDTRIP_SAMPLE))}</CmpText>
      {out !== undefined &&
        Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (
          <CmpText key={i} className={a[i] === b[i] ? "text-xs" : "text-destructive text-xs"}>
            {`${a[i] ?? "∅"}  →  ${b[i] ?? "∅"}`}
          </CmpText>
        ))}
    </ScrollView>
  );
}
