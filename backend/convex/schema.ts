import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Invariants kept by every mutation, so each list view is one index range:
  // a pinned note is never archived, and a trashed note is neither pinned nor
  // archived (restoring it brings it back to Notes).
  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(), // Markdown
    searchText: v.string(), // title + "\n" + body, kept in sync on every write
    tagIds: v.array(v.id("tags")),
    pinned: v.boolean(),
    archived: v.boolean(),
    deletedAt: v.optional(v.number()), // UTC ms; set = in trash
    version: v.number(), // increments on each save
    updatedAt: v.number(), // UTC ms
  })
    .index("by_user_state_pinned_updated", ["userId", "archived", "deletedAt", "pinned", "updatedAt"])
    .index("by_deleted", ["deletedAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["userId"],
    }),

  // Names are unique per user ignoring case, stored trimmed.
  tags: defineTable({
    userId: v.id("users"),
    name: v.string(),
    noteCount: v.number(), // its noteTags rows, kept by lib/tagLinks.ts
  }).index("by_user_name", ["userId", "name"]),

  // Mirrors notes.tagIds so a tag's notes can be found through an index.
  noteTags: defineTable({
    userId: v.id("users"),
    noteId: v.id("notes"),
    tagId: v.id("tags"),
  })
    .index("by_tag", ["tagId"])
    .index("by_note", ["noteId"]),
});
