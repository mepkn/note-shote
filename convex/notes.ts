import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getOwnedNote, getOwnedTag, requireUserId } from "./lib/access";
import {
  MAX_BODY_BYTES,
  MAX_TAGS_PER_NOTE,
  MAX_TITLE_CHARS,
  TRASH_DAYS,
  textBytes,
} from "./lib/limits";
import { firstLine, preview } from "./lib/preview";

const view = v.union(v.literal("notes"), v.literal("archive"), v.literal("trash"));
type View = Infer<typeof view>;

// What the list shows per note; the body stays on the server.
const noteSummary = v.object({
  _id: v.id("notes"),
  title: v.string(),
  fallbackTitle: v.string(), // first line of the body, for untitled notes
  preview: v.string(),
  tagIds: v.array(v.id("tags")),
  pinned: v.boolean(),
  archived: v.boolean(),
  deletedAt: v.optional(v.number()),
  updatedAt: v.number(),
});

const noteFull = v.object({
  _id: v.id("notes"),
  _creationTime: v.number(),
  title: v.string(),
  body: v.string(),
  tagIds: v.array(v.id("tags")),
  pinned: v.boolean(),
  archived: v.boolean(),
  deletedAt: v.optional(v.number()),
  version: v.number(),
  updatedAt: v.number(),
});

const PINNED_LIMIT = 100;
const SEARCH_LIMIT = 50;
// Trash can't be expressed as a search filter (deletedAt is "any number"), so
// trash search reads this many live+trashed matches and keeps the trashed ones.
const TRASH_SEARCH_SCAN = 256;
// A tag's notes are loaded in one go and sorted by updatedAt.
const TAG_NOTES_LIMIT = 1000;
const PURGE_BATCH = 100;
const EMPTY_TRASH_BATCH = 100;

function summarize(note: Doc<"notes">) {
  return {
    _id: note._id,
    title: note.title,
    fallbackTitle: note.title ? "" : firstLine(note.body),
    preview: preview(note.title ? note.body : note.body.split("\n").slice(1).join("\n")),
    tagIds: note.tagIds,
    pinned: note.pinned,
    archived: note.archived,
    deletedAt: note.deletedAt,
    updatedAt: note.updatedAt,
  };
}

function full(note: Doc<"notes">) {
  const { searchText: _searchText, userId: _userId, ...rest } = note;
  return rest;
}

function inView(note: Doc<"notes">, which: View): boolean {
  if (which === "trash") return note.deletedAt !== undefined;
  return note.deletedAt === undefined && note.archived === (which === "archive");
}

function normaliseTitle(title: string): string {
  const single = title.replace(/[\r\n]+/g, " ");
  if (single.length > MAX_TITLE_CHARS) throw new ConvexError("titleTooLong");
  return single;
}

function checkBody(body: string): string {
  if (textBytes(body) > MAX_BODY_BYTES) throw new ConvexError("bodyTooLong");
  return body;
}

async function checkTagIds(
  ctx: QueryCtx,
  userId: Id<"users">,
  tagIds: Id<"tags">[],
): Promise<Id<"tags">[]> {
  const unique = [...new Set(tagIds)];
  if (unique.length > MAX_TAGS_PER_NOTE) throw new ConvexError("tooManyTags");
  for (const tagId of unique) await getOwnedTag(ctx, userId, tagId);
  return unique;
}

// Keeps the noteTags join rows in step with note.tagIds.
async function syncNoteTags(
  ctx: MutationCtx,
  userId: Id<"users">,
  noteId: Id<"notes">,
  tagIds: Id<"tags">[],
): Promise<void> {
  const wanted = new Set(tagIds);
  const rows = await ctx.db
    .query("noteTags")
    .withIndex("by_note", (q) => q.eq("noteId", noteId))
    .take(MAX_TAGS_PER_NOTE * 2);
  for (const row of rows) {
    if (wanted.has(row.tagId)) wanted.delete(row.tagId);
    else await ctx.db.delete("noteTags", row._id);
  }
  for (const tagId of wanted) {
    await ctx.db.insert("noteTags", { userId, noteId, tagId });
  }
}

async function removeNote(ctx: MutationCtx, note: Doc<"notes">): Promise<void> {
  const rows = await ctx.db
    .query("noteTags")
    .withIndex("by_note", (q) => q.eq("noteId", note._id))
    .take(MAX_TAGS_PER_NOTE * 2);
  for (const row of rows) await ctx.db.delete("noteTags", row._id);
  await ctx.db.delete("notes", note._id);
}

export const list = query({
  args: { view, tagId: v.optional(v.id("tags")), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(noteSummary),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (args.tagId !== undefined) {
      // One page with everything: pinned first (in Notes), then newest edits.
      const tag = await getOwnedTag(ctx, userId, args.tagId);
      const links = await ctx.db
        .query("noteTags")
        .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
        .take(TAG_NOTES_LIMIT);
      const notes: Doc<"notes">[] = [];
      for (const link of links) {
        const note = await ctx.db.get("notes", link.noteId);
        if (note !== null && note.userId === userId && inView(note, args.view)) notes.push(note);
      }
      notes.sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
      );
      return { page: notes.map(summarize), isDone: true, continueCursor: "" };
    }

    // Pinned notes come from notes.pinned, so Notes pages only unpinned ones.
    const base = ctx.db.query("notes");
    const ranged =
      args.view === "trash"
        ? base.withIndex("by_user_state_pinned_updated", (q) =>
            q.eq("userId", userId).eq("archived", false).gte("deletedAt", 0),
          )
        : base.withIndex("by_user_state_pinned_updated", (q) =>
            q
              .eq("userId", userId)
              .eq("archived", args.view === "archive")
              .eq("deletedAt", undefined)
              .eq("pinned", false),
          );
    const result = await ranged.order("desc").paginate(args.paginationOpts);
    return { ...result, page: result.page.map(summarize) };
  },
});

export const pinned = query({
  args: {},
  returns: v.array(noteSummary),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user_state_pinned_updated", (q) =>
        q.eq("userId", userId).eq("archived", false).eq("deletedAt", undefined).eq("pinned", true),
      )
      .order("desc")
      .take(PINNED_LIMIT);
    return notes.map(summarize);
  },
});

export const search = query({
  args: { query: v.string(), view },
  returns: v.array(noteSummary),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const text = args.query.trim();
    if (!text) return [];
    if (args.view === "trash") {
      const hits = await ctx.db
        .query("notes")
        .withSearchIndex("search_text", (q) =>
          q.search("searchText", text).eq("userId", userId).eq("archived", false),
        )
        .take(TRASH_SEARCH_SCAN);
      return hits
        .filter((n) => n.deletedAt !== undefined)
        .slice(0, SEARCH_LIMIT)
        .map(summarize);
    }
    const hits = await ctx.db
      .query("notes")
      .withSearchIndex("search_text", (q) =>
        q
          .search("searchText", text)
          .eq("userId", userId)
          .eq("archived", args.view === "archive")
          .eq("deletedAt", undefined),
      )
      .take(SEARCH_LIMIT);
    return hits.map(summarize);
  },
});

export const get = query({
  args: { id: v.id("notes") },
  returns: noteFull,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return full(await getOwnedNote(ctx, userId, args.id));
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  returns: v.object({ _id: v.id("notes") }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const title = normaliseTitle(args.title ?? "");
    const body = checkBody(args.body ?? "");
    const tagIds = await checkTagIds(ctx, userId, args.tagIds ?? []);
    const _id = await ctx.db.insert("notes", {
      userId,
      title,
      body,
      searchText: `${title}\n${body}`,
      tagIds,
      pinned: false,
      archived: false,
      version: 1,
      updatedAt: Date.now(),
    });
    await syncNoteTags(ctx, userId, _id, tagIds);
    return { _id };
  },
});

// Last write wins: a save based on an older version still replaces the note.
// baseVersion is accepted so clients can report it, but never rejects a save.
export const save = mutation({
  args: { id: v.id("notes"), title: v.string(), body: v.string(), baseVersion: v.number() },
  returns: v.object({ version: v.number() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const note = await getOwnedNote(ctx, userId, args.id);
    const title = normaliseTitle(args.title);
    const body = checkBody(args.body);
    const version = note.version + 1;
    await ctx.db.patch("notes", note._id, {
      title,
      body,
      searchText: `${title}\n${body}`,
      version,
      updatedAt: Date.now(),
    });
    return { version };
  },
});

export const setTags = mutation({
  args: { id: v.id("notes"), tagIds: v.array(v.id("tags")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const note = await getOwnedNote(ctx, userId, args.id);
    const tagIds = await checkTagIds(ctx, userId, args.tagIds);
    await ctx.db.patch("notes", note._id, { tagIds, updatedAt: Date.now() });
    await syncNoteTags(ctx, userId, note._id, tagIds);
    return null;
  },
});

// Pinning and archiving don't touch trashed notes, and keep "pinned ⇒ not
// archived" (pinning brings a note back from the archive, archiving unpins).
export const setPinned = mutation({
  args: { id: v.id("notes"), pinned: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const note = await getOwnedNote(ctx, userId, args.id);
    if (note.deletedAt !== undefined) return null;
    await ctx.db.patch("notes", note._id, {
      pinned: args.pinned,
      ...(args.pinned ? { archived: false } : {}),
    });
    return null;
  },
});

export const setArchived = mutation({
  args: { id: v.id("notes"), archived: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const note = await getOwnedNote(ctx, userId, args.id);
    if (note.deletedAt !== undefined) return null;
    await ctx.db.patch("notes", note._id, {
      archived: args.archived,
      ...(args.archived ? { pinned: false } : {}),
    });
    return null;
  },
});

export const trash = mutation({
  args: { id: v.id("notes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const note = await getOwnedNote(ctx, userId, args.id);
    if (note.deletedAt !== undefined) return null;
    await ctx.db.patch("notes", note._id, {
      deletedAt: Date.now(),
      pinned: false,
      archived: false,
    });
    return null;
  },
});

export const restore = mutation({
  args: { id: v.id("notes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const note = await getOwnedNote(ctx, userId, args.id);
    if (note.deletedAt === undefined) throw new ConvexError("notInTrash");
    await ctx.db.patch("notes", note._id, { deletedAt: undefined });
    return null;
  },
});

export const deleteForever = mutation({
  args: { id: v.id("notes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const note = await getOwnedNote(ctx, userId, args.id);
    if (note.deletedAt === undefined) throw new ConvexError("notInTrash");
    await removeNote(ctx, note);
    return null;
  },
});

async function deleteTrashBatch(ctx: MutationCtx, userId: Id<"users">): Promise<boolean> {
  const notes = await ctx.db
    .query("notes")
    .withIndex("by_user_state_pinned_updated", (q) =>
      q.eq("userId", userId).eq("archived", false).gte("deletedAt", 0),
    )
    .take(EMPTY_TRASH_BATCH);
  for (const note of notes) await removeNote(ctx, note);
  return notes.length === EMPTY_TRASH_BATCH;
}

export const emptyTrash = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    if (await deleteTrashBatch(ctx, userId)) {
      await ctx.scheduler.runAfter(0, internal.notes.emptyTrashBatch, { userId });
    }
    return null;
  },
});

export const emptyTrashBatch = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await deleteTrashBatch(ctx, args.userId)) {
      await ctx.scheduler.runAfter(0, internal.notes.emptyTrashBatch, args);
    }
    return null;
  },
});

// Run daily by crons.ts. Reschedules itself while a full batch was deleted.
export const purgeTrash = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
    // gte(0) skips live notes, whose deletedAt is unset (sorts before numbers).
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_deleted", (q) => q.gte("deletedAt", 0).lt("deletedAt", cutoff))
      .take(PURGE_BATCH);
    for (const note of notes) await removeNote(ctx, note);
    if (notes.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.notes.purgeTrash, {});
    }
    return null;
  },
});
