import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { getOwnedTag, requireUserId } from "./lib/access";
import { MAX_TAG_NAME_CHARS, MAX_TAGS } from "./lib/limits";

// Join rows cleaned up per transaction after a tag is deleted.
const REMOVE_BATCH = 100;

function normaliseName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0 || trimmed.length > MAX_TAG_NAME_CHARS) {
    throw new ConvexError("tagNameInvalid");
  }
  return trimmed;
}

// Names are unique per user ignoring case ("Work" and "work" clash). A user
// has at most MAX_TAGS tags, so scanning them through the index is bounded.
async function assertNameFree(
  ctx: MutationCtx,
  userId: Id<"users">,
  name: string,
  except?: Id<"tags">,
): Promise<number> {
  const wanted = name.toLocaleLowerCase();
  const tags = await ctx.db
    .query("tags")
    .withIndex("by_user_name", (q) => q.eq("userId", userId))
    .take(MAX_TAGS);
  if (tags.some((t) => t._id !== except && t.name.toLocaleLowerCase() === wanted)) {
    throw new ConvexError("tagNameTaken");
  }
  return tags.length;
}

export const list = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("tags"), name: v.string(), count: v.number() })),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) => q.eq("userId", userId))
      .take(MAX_TAGS);
    return tags.map((tag) => ({ _id: tag._id, name: tag.name, count: tag.noteCount }));
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("tags"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = normaliseName(args.name);
    const count = await assertNameFree(ctx, userId, name);
    if (count >= MAX_TAGS) throw new ConvexError("tooManyTags");
    return await ctx.db.insert("tags", { userId, name, noteCount: 0 });
  },
});

export const rename = mutation({
  args: { id: v.id("tags"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tag = await getOwnedTag(ctx, userId, args.id);
    const name = normaliseName(args.name);
    await assertNameFree(ctx, userId, name, tag._id);
    await ctx.db.patch("tags", tag._id, { name });
    return null;
  },
});

// Removes up to REMOVE_BATCH of a deleted tag's join rows, and the tag from
// those notes. Returns whether there may be more.
async function removeLinksBatch(ctx: MutationCtx, tagId: Id<"tags">): Promise<boolean> {
  const links = await ctx.db
    .query("noteTags")
    .withIndex("by_tag", (q) => q.eq("tagId", tagId))
    .take(REMOVE_BATCH);
  for (const link of links) {
    const note = await ctx.db.get("notes", link.noteId);
    if (note !== null) {
      await ctx.db.patch("notes", note._id, { tagIds: note.tagIds.filter((id) => id !== tagId) });
    }
    await ctx.db.delete("noteTags", link._id);
  }
  return links.length === REMOVE_BATCH;
}

// Deletes the tag and removes it from every note that uses it; the notes stay.
// The first batch runs here; any rest continue in scheduled batches.
export const remove = mutation({
  args: { id: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tag = await getOwnedTag(ctx, userId, args.id);
    await ctx.db.delete("tags", tag._id);
    if (await removeLinksBatch(ctx, tag._id)) {
      await ctx.scheduler.runAfter(0, internal.tags.removeLinks, { tagId: tag._id });
    }
    return null;
  },
});

export const removeLinks = internalMutation({
  args: { tagId: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await removeLinksBatch(ctx, args.tagId)) {
      await ctx.scheduler.runAfter(0, internal.tags.removeLinks, args);
    }
    return null;
  },
});
