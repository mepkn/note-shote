import type { NoteEditorProps } from "./note-editor-types";
import { RawMarkdownEditor } from "./raw-markdown-editor";

// EnrichedMarkdownTextInput is native-only; web always edits raw Markdown.
export function NoteEditor(props: NoteEditorProps) {
  return <RawMarkdownEditor {...props} />;
}
