import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getOwnedTag, requireUserId } from "./lib/access";
import { MAX_TAG_NAME_CHARS, MAX_TAGS } from "./lib/limits";

// Upper bound on a tag's join rows read at once (counts and removal).
const MAX_LINKS = 5000;

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
    return await Promise.all(
      tags.map(async (tag) => {
        const links = await ctx.db
          .query("noteTags")
          .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
          .take(MAX_LINKS);
        return { _id: tag._id, name: tag.name, count: links.length };
      }),
    );
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
    return await ctx.db.insert("tags", { userId, name });
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

// Deletes the tag and removes it from every note that uses it; the notes stay.
export const remove = mutation({
  args: { id: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tag = await getOwnedTag(ctx, userId, args.id);
    const links = await ctx.db
      .query("noteTags")
      .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
      .take(MAX_LINKS);
    for (const link of links) {
      const note = await ctx.db.get("notes", link.noteId);
      if (note !== null) {
        await ctx.db.patch("notes", note._id, {
          tagIds: note.tagIds.filter((id) => id !== tag._id),
        });
      }
      await ctx.db.delete("noteTags", link._id);
    }
    await ctx.db.delete("tags", tag._id);
    return null;
  },
});
