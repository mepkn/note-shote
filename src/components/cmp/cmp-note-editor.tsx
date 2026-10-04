import { NoteEditor } from "@/components/note-editor";
import type { NoteEditorProps } from "@/components/note-editor-types";

export type CmpNoteEditorProps = NoteEditorProps;

// Rich Markdown input on Android (note-editor.tsx), raw Markdown on web
// (note-editor.web.tsx).
export function CmpNoteEditor(props: CmpNoteEditorProps) {
  return <NoteEditor {...props} />;
}
