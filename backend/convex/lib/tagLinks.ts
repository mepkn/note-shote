import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// Every noteTags insert and delete goes through these, so tags.noteCount stays
// equal to the tag's join rows without ever counting them.

async function bump(ctx: MutationCtx, tagId: Id<"tags">, delta: number): Promise<void> {
  const tag = await ctx.db.get("tags", tagId);
  // A deleted tag's rows are cleaned up after it's gone; nothing to count.
  if (tag !== null) await ctx.db.patch("tags", tagId, { noteCount: tag.noteCount + delta });
}

export async function addTagLink(
  ctx: MutationCtx,
  userId: Id<"users">,
  noteId: Id<"notes">,
  tagId: Id<"tags">,
): Promise<void> {
  await ctx.db.insert("noteTags", { userId, noteId, tagId });
  await bump(ctx, tagId, 1);
}

export async function removeTagLink(
  ctx: MutationCtx,
  link: { _id: Id<"noteTags">; tagId: Id<"tags"> },
): Promise<void> {
  await ctx.db.delete("noteTags", link._id);
  await bump(ctx, link.tagId, -1);
}
