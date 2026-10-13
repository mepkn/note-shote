import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  List,
  ListOrdered,
  Strikethrough,
  type LucideIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import {
  EnrichedMarkdownTextInput,
  type EnrichedMarkdownTextInputInstance,
  type StyleState,
} from "react-native-enriched-markdown";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpPromptDialog } from "@/components/cmp/cmp-prompt-dialog";
import { editorColors, markdownStyle } from "@/lib/markdown-style";
import { strings } from "@/lib/strings";
import type { NoteEditorProps } from "./note-editor-types";
import { RawMarkdownEditor } from "./raw-markdown-editor";

const t = strings.note.toolbar;

export function NoteEditor(props: NoteEditorProps) {
  if (props.raw) return <RawMarkdownEditor {...props} />;
  return <RichMarkdownEditor {...props} />;
}

// EnrichedMarkdownTextInput is uncontrolled: `value` is pushed in with
// setValue only when it differs from what the input last reported and the
// input isn't focused. Changes are only reported while focused, so loading a
// note (which the input may normalise) never counts as an edit by itself.
function RichMarkdownEditor({
  value,
  onChangeValue,
  onFocus,
  onBlur,
  placeholder,
  autoFocus,
  editable = true,
}: NoteEditorProps) {
  const ref = useRef<EnrichedMarkdownTextInputInstance>(null);
  const focused = useRef(false);
  const shown = useRef(value);
  const [state, setState] = useState<StyleState>();
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [linkOpen, setLinkOpen] = useState(false);
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const colors = editorColors[scheme];
  const style = useMemo(() => {
    const s = markdownStyle(scheme);
    return { strong: s.strong, em: s.em, link: s.link, h1: s.h1, h2: s.h2, h3: s.h3 };
  }, [scheme]);

  useEffect(() => {
    if (focused.current || value === shown.current) return;
    shown.current = value;
    ref.current?.setValue(value);
  }, [value]);

  const buttons: { icon: LucideIcon; label: string; active?: boolean; run: (input: EnrichedMarkdownTextInputInstance) => void }[] = [
    { icon: Bold, label: t.bold, active: state?.bold.isActive, run: (i) => i.toggleBold() },
    {
      icon: Italic,
      label: t.italic,
      active: state?.italic.isActive,
      run: (i) => i.toggleItalic(),
    },
    {
      icon: Strikethrough,
      label: t.strike,
      active: state?.strikethrough.isActive,
      run: (i) => i.toggleStrikethrough(),
    },
    ...([1, 2, 3] as const).map((level) => ({
      icon: [Heading1, Heading2, Heading3][level - 1],
      label: [t.h1, t.h2, t.h3][level - 1],
      // level stays set when isActive is false, so check both.
      active: !!state?.heading.isActive && state.heading.level === level,
      run: (i: EnrichedMarkdownTextInputInstance) => i.toggleHeading(level),
    })),
    {
      icon: List,
      label: t.bullets,
      active: state?.unorderedList.isActive,
      run: (i) => i.toggleUnorderedList(),
    },
    {
      icon: ListOrdered,
      label: t.numbers,
      active: state?.orderedList.isActive,
      run: (i) => i.toggleOrderedList(),
    },
    { icon: Link, label: t.link, active: state?.link.isActive, run: () => setLinkOpen(true) },
    { icon: IndentIncrease, label: t.indent, run: (i) => i.indentList() },
    { icon: IndentDecrease, label: t.outdent, run: (i) => i.outdentList() },
  ];

  return (
    <View className="flex-1">
      <EnrichedMarkdownTextInput
        ref={ref}
        defaultValue={value}
        editable={editable}
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        cursorColor={colors.link}
        markdownShortcuts
        markdownStyle={style}
        onFocus={() => {
          focused.current = true;
          onFocus?.();
        }}
        onBlur={() => {
          focused.current = false;
          onBlur?.();
        }}
        onChangeMarkdown={(markdown) => {
          if (!focused.current || markdown === shown.current) return;
          shown.current = markdown;
          onChangeValue(markdown);
        }}
        onChangeState={setState}
        onChangeSelection={setSelection}
        style={{ flex: 1, fontSize: 16, color: colors.text, paddingHorizontal: 16, paddingVertical: 12 }}
      />
      {editable && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          className="border-border bg-background max-h-12 flex-grow-0 border-t"
          contentContainerClassName="items-center gap-0.5 px-2">
          {buttons.map((b) => (
            <CmpButton
              key={b.label}
              size="icon"
              variant={b.active ? "secondary" : "ghost"}
              icon={b.icon}
              label={b.label}
              accessibilityState={{ selected: !!b.active }}
              onPress={() => ref.current && b.run(ref.current)}
            />
          ))}
        </ScrollView>
      )}
      <CmpPromptDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title={strings.note.linkTitle}
        placeholder={strings.note.linkPlaceholder}
        submitLabel={strings.save}
        cancelLabel={strings.cancel}
        onSubmit={(raw) => {
          setLinkOpen(false);
          const url = /^[a-z][a-z0-9+.-]*:/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
          if (selection.end > selection.start) ref.current?.setLink(url);
          else ref.current?.insertLink(raw.trim(), url);
          ref.current?.focus();
        }}
      />
    </View>
  );
}
