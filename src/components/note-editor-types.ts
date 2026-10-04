export type NoteEditorProps = {
  // The Markdown to show. The editor reports edits through onChangeValue; a new
  // value from outside is only applied while the editor isn't focused.
  value: string;
  onChangeValue: (markdown: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
  // Native only: edit as raw Markdown even if the rich editor is available.
  raw?: boolean;
};
