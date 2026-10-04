import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_BODY_BYTES, MAX_TITLE_CHARS, textBytes } from "@convex/lib/limits";
import { errorMessage } from "./errors";

export type SyncStatus = "loading" | "saving" | "saved" | "offline";
export type NoteField = "title" | "body";

const SAVE_DELAY_MS = 500;

// One note, synced last-write-wins (like scratch's pad).
// Local edits are saved SAVE_DELAY_MS after typing stops. A remote change is
// applied only while no field is focused and there are no unsaved or in-flight
// local edits, so a remote value never lands in a focused editor.
// Without an id, the note is created on the first save and the id is reported
// through onCreated.
export function useNote(id: Id<"notes"> | undefined, onCreated: (id: Id<"notes">) => void) {
  // Starts as id; set to the new note's id once the first save creates it.
  const [currentId, setCurrentId] = useState(id);
  const remote = useQuery(api.notes.get, currentId ? { id: currentId } : "skip");
  const createMutation = useMutation(api.notes.create);
  const saveMutation = useMutation(api.notes.save);
  const connection = useConvexConnectionState();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(id === undefined);
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState<Record<NoteField, boolean>>({ title: false, body: false });
  const [error, setError] = useState<string>();
  const [tooLong, setTooLong] = useState(false);
  // Re-renders controlled inputs when a change is refused, so the native view
  // snaps back to the last accepted text.
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const latest = useRef({ title: "", body: "" });
  const noteId = useRef(id);
  const version = useRef(0);
  const dirty = useRef(false);
  const inflight = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Set while the first save is creating the note; later saves wait for it.
  const creating = useRef<Promise<unknown>>(undefined);
  const isFocused = focused.title || focused.body;

  useEffect(() => {
    if (remote === undefined || pending || isFocused) return;
    // Our own save may already be newer than a subscription result in flight.
    if (loaded && remote.version < version.current) return;
    version.current = remote.version;
    latest.current = { title: remote.title, body: remote.body };
    setTitle(remote.title);
    setBody(remote.body);
    setLoaded(true);
  }, [remote, pending, isFocused, loaded]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (creating.current) await creating.current;
    if (!dirty.current) return;
    dirty.current = false;
    const sent = latest.current;
    inflight.current++;
    try {
      if (noteId.current === undefined) {
        const created = createMutation(sent);
        creating.current = created.catch(() => {});
        const { _id } = await created.finally(() => (creating.current = undefined));
        noteId.current = _id;
        version.current = 1;
        setCurrentId(_id);
        onCreated(_id);
      } else {
        const result = await saveMutation({
          id: noteId.current,
          ...sent,
          baseVersion: version.current,
        });
        version.current = result.version;
      }
      setError(undefined);
    } catch (e) {
      // Keep the edit unsaved; the next keystroke retries.
      dirty.current = true;
      setError(errorMessage(e));
    } finally {
      inflight.current--;
      if (!dirty.current && inflight.current === 0) setPending(false);
    }
  }, [createMutation, saveMutation, onCreated]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  const changeTitle = useCallback(
    (next: string) => {
      const single = next.replace(/[\r\n]+/g, " ");
      if (single.length > MAX_TITLE_CHARS) {
        forceRender();
        return;
      }
      latest.current = { ...latest.current, title: single };
      setTitle(single);
      schedule();
    },
    [schedule],
  );

  const changeBody = useCallback(
    (next: string) => {
      const bytes = textBytes(next);
      if (bytes > MAX_BODY_BYTES && bytes > textBytes(latest.current.body)) {
        setTooLong(true);
        forceRender();
        return;
      }
      setTooLong(false);
      latest.current = { ...latest.current, body: next };
      setBody(next);
      schedule();
    },
    [schedule],
  );

  const setFieldFocused = useCallback(
    (field: NoteField, value: boolean) => {
      setFocused((f) => ({ ...f, [field]: value }));
      // Leaving a field saves straight away rather than waiting for the timer.
      if (!value) void flush();
    },
    [flush],
  );

  // Don't drop the last few keystrokes when leaving the screen.
  useEffect(() => () => void flush(), [flush]);

  const status: SyncStatus = !connection.isWebSocketConnected
    ? "offline"
    : !loaded
      ? "loading"
      : pending
        ? "saving"
        : "saved";

  return {
    id: currentId,
    note: remote,
    title,
    body,
    loaded,
    status,
    error,
    tooLong,
    bytes: textBytes(body),
    changeTitle,
    changeBody,
    setFieldFocused,
    flush,
  };
}
