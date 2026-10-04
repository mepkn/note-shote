import { useMutation } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { router, Stack, useLocalSearchParams, type ErrorBoundaryProps } from "expo-router";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Eye,
  Pencil,
  Pin,
  PinOff,
  Tag,
  Trash2,
  Undo2,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_BODY_BYTES, MAX_TITLE_CHARS } from "@convex/lib/limits";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpConfirmDialog } from "@/components/cmp/cmp-confirm-dialog";
import { CmpKeyboardPadding } from "@/components/cmp/cmp-keyboard-padding";
import { CmpMarkdown } from "@/components/cmp/cmp-markdown";
import { CmpNoteEditor } from "@/components/cmp/cmp-note-editor";
import { CmpText } from "@/components/cmp/cmp-text";
import { ErrorScreen } from "@/components/error-screen";
import { TagPicker } from "@/components/tag-picker";
import { errorMessage } from "@/lib/errors";
import { canEditRich } from "@/lib/markdown-compat";
import { strings } from "@/lib/strings";
import { useNote, type SyncStatus } from "@/lib/use-note";
import { cn } from "@/lib/utils";

const s = strings.note;

const STATUS_LABEL: Record<SyncStatus, string> = {
  loading: s.loading,
  saving: s.saving,
  saved: s.saved,
  offline: s.offline,
};

// The size counter appears once the body passes this share of the limit.
const COUNTER_FROM = 0.8;
const kb = (bytes: number) => (bytes / 1024).toFixed(1);

// notes.get throws for a missing note, e.g. one deleted on another device.
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} />;
}

export default function NoteScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  // The id is fixed for the screen's life; a created note keeps this screen.
  const [initialId] = useState(() => (params.id || undefined) as Id<"notes"> | undefined);
  const onCreated = useCallback((id: Id<"notes">) => router.setParams({ id }), []);
  const n = useNote(initialId, onCreated);
  const id = n.id;

  const [editing, setEditing] = useState(initialId === undefined);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const setPinned = useMutation(api.notes.setPinned);
  const setArchived = useMutation(api.notes.setArchived);
  const setTags = useMutation(api.notes.setTags);
  const trash = useMutation(api.notes.trash);
  const restore = useMutation(api.notes.restore);
  const deleteForever = useMutation(api.notes.deleteForever);

  const note = n.note;
  const inTrash = note?.deletedAt !== undefined;

  // Decided when editing starts, so the editor doesn't switch mid-edit.
  const [raw, setRaw] = useState(false);
  const startEditing = () => {
    setRaw(Platform.OS !== "web" && !canEditRich(n.body));
    setEditing(true);
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function act(task: () => Promise<unknown>) {
    setActionError(undefined);
    try {
      await task();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const editLabel = editing ? (Platform.OS === "web" || raw ? s.preview : s.done) : s.edit;
  const nearLimit = n.bytes >= MAX_BODY_BYTES * COUNTER_FROM;

  const headerRight = () => (
      <View className="flex-row items-center">
        {inTrash ? (
          <>
            <CmpButton
              variant="ghost"
              size="icon"
              icon={Undo2}
              label={s.restore}
              onPress={() => void act(() => restore({ id: id! }))}
            />
            <CmpButton
              variant="ghost"
              size="icon"
              icon={Trash2}
              tone="destructive"
              label={s.deleteForever}
              onPress={() => setConfirmDelete(true)}
            />
          </>
        ) : (
          <>
            <CmpButton
              variant="ghost"
              size="icon"
              icon={editing ? (Platform.OS === "web" || raw ? Eye : Check) : Pencil}
              label={editLabel}
              disabled={!n.loaded}
              onPress={() => {
                if (editing) {
                  void n.flush();
                  setEditing(false);
                } else startEditing();
              }}
            />
            {id && note && (
              <>
                <CmpButton
                  variant="ghost"
                  size="icon"
                  icon={note.pinned ? PinOff : Pin}
                  label={note.pinned ? s.unpin : s.pin}
                  onPress={() => void act(() => setPinned({ id, pinned: !note.pinned }))}
                />
                <CmpButton
                  variant="ghost"
                  size="icon"
                  icon={Tag}
                  label={s.tags}
                  onPress={() => setTagsOpen(true)}
                />
                <CmpButton
                  variant="ghost"
                  size="icon"
                  icon={note.archived ? ArchiveRestore : Archive}
                  label={note.archived ? s.unarchive : s.archive}
                  onPress={() => void act(() => setArchived({ id, archived: !note.archived }))}
                />
                <CmpButton
                  variant="ghost"
                  size="icon"
                  icon={copied ? Check : Copy}
                  label={copied ? s.copied : s.copy}
                  onPress={async () => {
                    await Clipboard.setStringAsync(n.body);
                    setCopied(true);
                  }}
                />
                <CmpButton
                  variant="ghost"
                  size="icon"
                  icon={Trash2}
                  label={s.trash}
                  onPress={() =>
                    void act(async () => {
                      await n.flush();
                      await trash({ id });
                      leave();
                    })
                  }
                />
              </>
            )}
          </>
        )}
      </View>
  );

  const readOnly = inTrash || !n.loaded;

  return (
    <SafeAreaView edges={["bottom"]} className="bg-background flex-1">
      <Stack.Screen options={{ headerTitle: "", headerRight }} />
      {/* The editor, toolbar and status line sit above the keyboard. */}
      <CmpKeyboardPadding>
        <View className="mx-auto w-full max-w-3xl flex-1">
          <TextInput
            value={n.title}
            onChangeText={n.changeTitle}
            onFocus={() => n.setFieldFocused("title", true)}
            onBlur={() => n.setFieldFocused("title", false)}
            placeholder={s.titlePlaceholder}
            editable={!readOnly}
            maxLength={MAX_TITLE_CHARS}
            submitBehavior="blurAndSubmit"
            returnKeyType="next"
            onSubmitEditing={() => !editing && startEditing()}
            placeholderClassName="text-muted-foreground"
            className={cn(
              "text-foreground px-4 pb-1 pt-4 text-2xl font-bold",
              Platform.select({ web: "placeholder:text-muted-foreground outline-none" }),
            )}
          />
          {inTrash && <CmpText className="text-muted-foreground px-4 text-sm">{s.inTrash}</CmpText>}
          {editing && raw && (
            <CmpText className="text-muted-foreground px-4 pt-1 text-xs">{s.rawNotice}</CmpText>
          )}

          {editing && !readOnly ? (
            <CmpNoteEditor
              value={n.body}
              onChangeValue={n.changeBody}
              onFocus={() => n.setFieldFocused("body", true)}
              onBlur={() => n.setFieldFocused("body", false)}
              placeholder={s.bodyPlaceholder}
              autoFocus={initialId !== undefined || Platform.OS === "web"}
              raw={raw}
            />
          ) : (
            <ScrollView className="flex-1" contentContainerClassName="px-4 py-3 pb-12">
              <Pressable
                // Tapping the rendered body starts editing on Android.
                disabled={Platform.OS !== "android" || readOnly}
                onPress={startEditing}>
                {n.body ? (
                  <CmpMarkdown markdown={n.body} />
                ) : (
                  <CmpText variant="muted">{n.loaded && !inTrash ? s.emptyBody : ""}</CmpText>
                )}
              </Pressable>
            </ScrollView>
          )}

          <View className="border-border flex-row items-center gap-3 border-t px-4 py-1.5">
            <CmpText
              variant="muted"
              className={cn("text-xs", n.status === "offline" && "text-destructive")}>
              {STATUS_LABEL[n.status]}
            </CmpText>
            {(n.error || n.tooLong || actionError) && (
              <CmpText className="text-destructive flex-1 text-xs" numberOfLines={1}>
                {n.tooLong ? s.tooLong : (n.error ?? actionError)}
              </CmpText>
            )}
            {nearLimit && (
              <CmpText
                variant="muted"
                className={cn("ml-auto text-xs", n.tooLong && "text-destructive")}>
                {s.size(kb(n.bytes), kb(MAX_BODY_BYTES))}
              </CmpText>
            )}
          </View>
        </View>
      </CmpKeyboardPadding>

      {id && note && (
        <TagPicker
          open={tagsOpen}
          onOpenChange={setTagsOpen}
          selected={note.tagIds}
          onChange={(tagIds) => setTags({ id, tagIds })}
        />
      )}
      <CmpConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={s.deleteForeverTitle}
        description={s.deleteForeverDescription}
        confirmLabel={s.deleteForever}
        cancelLabel={strings.cancel}
        destructive
        onConfirm={() =>
          void act(async () => {
            // Leave first: the open note's query fails once it's gone.
            leave();
            await deleteForever({ id: id! });
          })
        }
      />
    </SafeAreaView>
  );
}
