import { CmpEditor } from "@/components/cmp/cmp-editor";
import type { NoteEditorProps } from "./note-editor-types";

// Plain monospace Markdown source. Used on web, and on Android for notes the
// rich editor can't round-trip.
export function RawMarkdownEditor({
  value,
  onChangeValue,
  onFocus,
  onBlur,
  placeholder,
  autoFocus,
  editable = true,
}: NoteEditorProps) {
  return (
    <CmpEditor
      value={value}
      onChangeText={onChangeValue}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      editable={editable}
      scrollEnabled
    />
  );
}
