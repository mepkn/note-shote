import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  CopyIcon,
  EllipsisIcon,
  EyeIcon,
  Loader2Icon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  RotateCcwIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MAX_BODY_BYTES, MAX_TITLE_CHARS, textBytes } from "@convex/lib/limits";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Markdown } from "@/components/Markdown";
import { NoteTagsDialog } from "@/components/NoteTagsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorMessage } from "@/lib/errors";
import { formatKB, timeAgo } from "@/lib/notes";
import { strings } from "@/lib/strings";

const s = strings.editor;
const SAVE_DELAY_MS = 500;

type Note = Omit<Doc<"notes">, "userId" | "searchText">;
type Synced = { title: string; body: string; version: number };

type Props = { id: Id<"notes">; onBack: () => void; onClosed: () => void; onTag: (id: Id<"tags">) => void };

export function NoteEditor({ id, ...props }: Props) {
  const note = useQuery(api.notes.get, { id });
  if (note === undefined) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <LoadedEditor key={id} note={note} {...props} />;
}

/**
 * Edits are saved 500 ms after typing stops, and at once when a field loses focus. A newer
 * server version (another device) replaces the fields only while neither is focused and
 * nothing is unsaved, so a remote value never lands under the cursor. Last write wins.
 */
function LoadedEditor({ note, onBack, onClosed, onTag }: Omit<Props, "id"> & { note: Note }) {
  const save = useMutation(api.notes.save);
  const setPinned = useMutation(api.notes.setPinned);
  const setArchived = useMutation(api.notes.setArchived);
  const trash = useMutation(api.notes.trash);
  const restore = useMutation(api.notes.restore);
  const deleteForever = useMutation(api.notes.deleteForever);
  const tags = useQuery(api.tags.list);
  const connection = useConvexConnectionState();

  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [synced, setSynced] = useState<Synced>({ title: note.title, body: note.body, version: note.version });
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [editing, setEditing] = useState(note.body === "" && note.title === "");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trashed = note.deletedAt !== undefined;
  const dirty = title !== synced.title || body !== synced.body;

  // Another device saved: take its version when it's safe (adjusting state during render).
  if (note.version > synced.version && !dirty && !saving && !focused) {
    setSynced({ title: note.title, body: note.body, version: note.version });
    setTitle(note.title);
    setBody(note.body);
  }

  const flush = () => {
    if (!dirty || saving || trashed) return;
    const sent = { title, body };
    setSaving(true);
    save({ id: note._id, ...sent, baseVersion: synced.version })
      .then(({ version }) => {
        setSynced({ ...sent, version });
        setFailed(false);
      })
      .catch((error) => {
        setFailed(true);
        toast.error(errorMessage(error));
      })
      .finally(() => setSaving(false));
  };

  // Debounced autosave; re-runs after each save so edits made meanwhile follow.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => {
    if (!dirty || saving || failed) return;
    const timer = setTimeout(() => flushRef.current(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, body, dirty, saving, failed]);

  // Leaving the note (another note, back, sign-out) saves what's pending.
  useEffect(() => () => flushRef.current(), []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const status = !connection.isWebSocketConnected
    ? s.offline
    : saving || (dirty && !failed)
      ? s.saving
      : failed
        ? s.unsaved
        : s.saved;

  const bytes = textBytes(body);
  const tagNames = new Map(tags?.map((t) => [t._id, t.name]));
  const run = (promise: Promise<unknown>, done?: string) =>
    promise.then(() => done && toast.success(done)).catch((error) => toast.error(errorMessage(error)));

  const fieldProps = {
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      flush();
    },
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={strings.back} onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        <span className="flex-1 truncate px-2 text-xs text-muted-foreground" aria-live="polite">
          {trashed ? s.readOnlyTrash : `${status} · ${s.edited(timeAgo(note.updatedAt))}`}
        </span>
        {trashed ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => void run(restore({ id: note._id }), s.restored)}>
              <RotateCcwIcon /> {s.restore}
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2Icon /> {s.deleteForever}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? <EyeIcon /> : <PencilIcon />}
              {editing ? s.preview : s.edit}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={note.pinned ? s.unpin : s.pin}
              title={note.pinned ? s.unpin : s.pin}
              onClick={() => void run(setPinned({ id: note._id, pinned: !note.pinned }))}
            >
              {note.pinned ? <PinOffIcon /> : <PinIcon />}
            </Button>
            <Button variant="ghost" size="icon" aria-label={s.tags} title={s.tags} onClick={() => setTagsOpen(true)}>
              <TagIcon />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={s.actions} />}>
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => void run(setArchived({ id: note._id, archived: !note.archived }))}
                >
                  {note.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                  {note.archived ? s.unarchive : s.archive}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void run(navigator.clipboard.writeText(title ? `# ${title}\n\n${body}` : body), s.copied)}
                >
                  <CopyIcon /> {s.copy}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    flush();
                    void trash({ id: note._id })
                      .then(() =>
                        toast.success(s.trashed, {
                          action: { label: s.restore, onClick: () => void run(restore({ id: note._id })) },
                        }),
                      )
                      .catch((error) => toast.error(errorMessage(error)));
                  }}
                >
                  <Trash2Icon /> {s.trash}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-6 md:px-8">
          {editing && !trashed ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/[\r\n]+/g, " "))}
              maxLength={MAX_TITLE_CHARS}
              placeholder={s.titlePlaceholder}
              aria-label={s.titlePlaceholder}
              autoFocus={!title && !body}
              className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
              {...fieldProps}
            />
          ) : (
            title && <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
          )}

          {note.tagIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tagIds.map((id) =>
                tagNames.has(id) ? (
                  <Badge key={id} variant="outline" render={<button type="button" onClick={() => onTag(id)} />}>
                    {tagNames.get(id)}
                  </Badge>
                ) : null,
              )}
            </div>
          )}

          {editing && !trashed ? (
            <>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={s.bodyPlaceholder}
                aria-label={s.bodyPlaceholder}
                spellCheck
                className="min-h-[60svh] w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none [field-sizing:content] placeholder:text-muted-foreground/60"
                {...fieldProps}
              />
              {bytes > MAX_BODY_BYTES * 0.8 && (
                <p className={bytes > MAX_BODY_BYTES ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                  {s.bytes(formatKB(bytes), formatKB(MAX_BODY_BYTES))}
                </p>
              )}
            </>
          ) : body ? (
            <Markdown text={body} />
          ) : (
            <p className="text-sm text-muted-foreground">{trashed ? "" : s.emptyBody}</p>
          )}
        </div>
      </div>

      <NoteTagsDialog noteId={note._id} tagIds={note.tagIds} open={tagsOpen} onOpenChange={setTagsOpen} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={s.deleteTitle}
        description={s.deleteDescription}
        confirmLabel={s.deleteForever}
        onConfirm={() => {
          void deleteForever({ id: note._id })
            .then(() => {
              onClosed();
              toast.success(s.deleted);
            })
            .catch((error) => toast.error(errorMessage(error)));
        }}
      />
    </div>
  );
}
