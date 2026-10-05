import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  MAX_BODY_BYTES,
  MAX_TAG_NAME_CHARS,
  MAX_TAGS_PER_NOTE,
  MAX_TITLE_CHARS,
} from "./lib/limits";
import { newTest, signedInUser, type TestConvex } from "./test.helpers";

const page = { numItems: 50, cursor: null };
const DAY = 24 * 60 * 60 * 1000;

async function joinRows(t: TestConvex) {
  return await t.run((ctx) => ctx.db.query("noteTags").collect());
}

describe("allowlist", () => {
  test("a non-allowlisted email can't sign up or sign in", async () => {
    const t = newTest();
    for (const flow of ["signUp", "signIn"] as const) {
      await expect(
        t.action(api.auth.signIn, {
          provider: "password",
          params: { email: "mallory@example.com", password: "password123", flow },
        }),
      ).rejects.toThrow("notAllowed");
    }
    // Rejected before anything is stored.
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toEqual([]);
  });

  test("an allowlisted email can sign up, case-insensitively", async () => {
    const t = newTest();
    // Token minting needs JWT_PRIVATE_KEY, which tests don't set; the account
    // is stored before that step.
    await t
      .action(api.auth.signIn, {
        provider: "password",
        params: { email: " BOB@example.com ", password: "password123", flow: "signUp" },
      })
      .catch(() => {});
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users.map((u) => u.email)).toEqual(["bob@example.com"]);
  });

  test("an unset list allows nobody", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    vi.stubEnv("ALLOWED_EMAILS", "");
    await expect(alice.as.query(api.tags.list, {})).rejects.toThrow("notAllowed");
  });

  test("a signed-in user whose email isn't allowed is refused", async () => {
    const t = newTest();
    const mallory = await signedInUser(t, "mallory@example.com");
    await expect(mallory.as.query(api.tags.list, {})).rejects.toThrow("notAllowed");
    await expect(mallory.as.mutation(api.notes.create, {})).rejects.toThrow("notAllowed");
    await expect(mallory.as.query(api.tags.list, {})).rejects.toThrow("notAllowed");
    await expect(mallory.as.query(api.users.me, {})).rejects.toThrow("notAllowed");
  });

  test("removing an email cuts off an existing session", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const { _id } = await alice.as.mutation(api.notes.create, { body: "hi" });
    vi.stubEnv("ALLOWED_EMAILS", "bob@example.com");
    await expect(alice.as.query(api.notes.get, { id: _id })).rejects.toThrow("notAllowed");
    await expect(
      alice.as.mutation(api.notes.save, { id: _id, title: "", body: "x", baseVersion: 1 }),
    ).rejects.toThrow("notAllowed");
    await expect(
      alice.as.query(api.notes.list, { view: "notes", paginationOpts: page }),
    ).rejects.toThrow("notAllowed");
  });

  test("anonymous callers are refused", async () => {
    const t = newTest();
    await expect(t.query(api.tags.list, {})).rejects.toThrow("notAuthenticated");
    await expect(t.mutation(api.notes.create, {})).rejects.toThrow("notAuthenticated");
  });
});

describe("ownership", () => {
  test("user A can't touch user B's notes or tags", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const bob = await signedInUser(t, "bob@example.com");
    const bobTag = await bob.as.mutation(api.tags.create, { name: "secret" });
    const { _id: bobNote } = await bob.as.mutation(api.notes.create, {
      title: "bob's plans",
      body: "zebra crossing",
      tagIds: [bobTag],
    });
    const aliceTag = await alice.as.mutation(api.tags.create, { name: "mine" });
    const { _id: aliceNote } = await alice.as.mutation(api.notes.create, { body: "a" });

    const notFound = "noteNotFound";
    await expect(alice.as.query(api.notes.get, { id: bobNote })).rejects.toThrow(notFound);
    await expect(
      alice.as.mutation(api.notes.save, { id: bobNote, title: "x", body: "x", baseVersion: 1 }),
    ).rejects.toThrow(notFound);
    await expect(
      alice.as.mutation(api.notes.setTags, { id: bobNote, tagIds: [aliceTag] }),
    ).rejects.toThrow(notFound);
    await expect(
      alice.as.mutation(api.notes.setPinned, { id: bobNote, pinned: true }),
    ).rejects.toThrow(notFound);
    await expect(
      alice.as.mutation(api.notes.setArchived, { id: bobNote, archived: true }),
    ).rejects.toThrow(notFound);
    await expect(alice.as.mutation(api.notes.trash, { id: bobNote })).rejects.toThrow(notFound);
    await expect(alice.as.mutation(api.notes.restore, { id: bobNote })).rejects.toThrow(notFound);
    await expect(alice.as.mutation(api.notes.deleteForever, { id: bobNote })).rejects.toThrow(
      notFound,
    );

    // B's tags can't be used, renamed, removed or listed by A.
    const tagNotFound = "tagNotFound";
    await expect(
      alice.as.mutation(api.notes.setTags, { id: aliceNote, tagIds: [bobTag] }),
    ).rejects.toThrow(tagNotFound);
    await expect(alice.as.mutation(api.notes.create, { tagIds: [bobTag] })).rejects.toThrow(
      tagNotFound,
    );
    await expect(
      alice.as.query(api.notes.byTag, { tagId: bobTag, paginationOpts: page }),
    ).rejects.toThrow(tagNotFound);
    await expect(alice.as.mutation(api.tags.rename, { id: bobTag, name: "x" })).rejects.toThrow(
      tagNotFound,
    );
    await expect(alice.as.mutation(api.tags.remove, { id: bobTag })).rejects.toThrow(tagNotFound);
    expect((await alice.as.query(api.tags.list, {})).map((t) => t.name)).toEqual(["mine"]);

    // Lists and search only show A's own notes.
    const list = await alice.as.query(api.notes.list, { view: "notes", paginationOpts: page });
    expect(list.page.map((n) => n._id)).toEqual([aliceNote]);
    expect(
      (await alice.as.query(api.notes.search, { query: "zebra", paginationOpts: page })).page,
    ).toEqual([]);
    expect(
      (await bob.as.query(api.notes.search, { query: "zebra", paginationOpts: page })).page,
    ).toHaveLength(1);

    // Bob's note is unchanged.
    const got = await bob.as.query(api.notes.get, { id: bobNote });
    expect(got).toMatchObject({ title: "bob's plans", version: 1, tagIds: [bobTag] });
    expect(got.deletedAt).toBeUndefined();
  });
});

describe("limits", () => {
  test("title, body and tag caps are enforced", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const { _id } = await alice.as.mutation(api.notes.create, {});
    const save = (title: string, body: string) =>
      alice.as.mutation(api.notes.save, { id: _id, title, body, baseVersion: 0 });

    await expect(save("t".repeat(MAX_TITLE_CHARS), "a".repeat(MAX_BODY_BYTES))).resolves.toEqual({
      version: 2,
    });
    await expect(save("t".repeat(MAX_TITLE_CHARS + 1), "")).rejects.toThrow("titleTooLong");
    await expect(save("", "a".repeat(MAX_BODY_BYTES + 1))).rejects.toThrow("bodyTooLong");
    // Multi-byte characters count by their UTF-8 size.
    await expect(save("", "é".repeat(MAX_BODY_BYTES / 2 + 1))).rejects.toThrow("bodyTooLong");
    await expect(alice.as.mutation(api.notes.create, { title: "t".repeat(201) })).rejects.toThrow(
      "titleTooLong",
    );

    const tagIds: Id<"tags">[] = [];
    for (let i = 0; i <= MAX_TAGS_PER_NOTE; i++) {
      tagIds.push(await alice.as.mutation(api.tags.create, { name: `tag ${i}` }));
    }
    await expect(
      alice.as.mutation(api.notes.setTags, { id: _id, tagIds: tagIds.slice(0, MAX_TAGS_PER_NOTE) }),
    ).resolves.toBeNull();
    await expect(alice.as.mutation(api.notes.setTags, { id: _id, tagIds })).rejects.toThrow(
      "tooManyTags",
    );
    await expect(alice.as.mutation(api.notes.create, { tagIds })).rejects.toThrow("tooManyTags");

    await expect(
      alice.as.mutation(api.tags.create, { name: "x".repeat(MAX_TAG_NAME_CHARS + 1) }),
    ).rejects.toThrow("tagNameInvalid");
    await expect(alice.as.mutation(api.tags.create, { name: "   " })).rejects.toThrow(
      "tagNameInvalid",
    );
  });
});

describe("saving", () => {
  test("version bumps on each save, and a stale baseVersion still wins", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const { _id } = await alice.as.mutation(api.notes.create, {});
    const save = (body: string, baseVersion: number) =>
      alice.as.mutation(api.notes.save, { id: _id, title: "", body, baseVersion });
    expect(await save("a", 1)).toEqual({ version: 2 });
    expect(await save("b", 2)).toEqual({ version: 3 });
    // Based on version 2 while the server is at 3: last write wins.
    expect(await save("c", 2)).toEqual({ version: 4 });
    expect(await alice.as.query(api.notes.get, { id: _id })).toMatchObject({
      body: "c",
      version: 4,
    });
  });

  test("searchText follows the title and body", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const { _id } = await alice.as.mutation(api.notes.create, { title: "Apple", body: "banana" });
    const searchText = () => t.run(async (ctx) => (await ctx.db.get("notes", _id))?.searchText);
    expect(await searchText()).toBe("Apple\nbanana");
    await alice.as.mutation(api.notes.save, {
      id: _id,
      title: "Cherry",
      body: "date",
      baseVersion: 1,
    });
    expect(await searchText()).toBe("Cherry\ndate");
    expect(
      (await alice.as.query(api.notes.search, { query: "cherry", paginationOpts: page })).page,
    ).toHaveLength(1);
    expect(
      (await alice.as.query(api.notes.search, { query: "banana", paginationOpts: page })).page,
    ).toEqual([]);
  });

  test("titles are single-line", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const { _id } = await alice.as.mutation(api.notes.create, { title: "a\nb" });
    expect((await alice.as.query(api.notes.get, { id: _id })).title).toBe("a b");
  });
});

describe("views", () => {
  test("pinned notes lead the Notes list, archive and trash keep their own lists", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const make = async (title: string) =>
      (await alice.as.mutation(api.notes.create, { title }))._id;
    const a = await make("a");
    const b = await make("b");
    const c = await make("c");
    const d = await make("d");
    await alice.as.mutation(api.notes.setPinned, { id: b, pinned: true });
    await alice.as.mutation(api.notes.setArchived, { id: c, archived: true });
    await alice.as.mutation(api.notes.trash, { id: d });

    const ids = async (view: "notes" | "archive" | "trash") =>
      (await alice.as.query(api.notes.list, { view, paginationOpts: page })).page.map((n) => n._id);
    expect(await ids("notes")).toEqual([b, a]);
    expect(await ids("archive")).toEqual([c]);
    expect(await ids("trash")).toEqual([d]);

    // Archiving unpins; pinning unarchives.
    await alice.as.mutation(api.notes.setArchived, { id: b, archived: true });
    expect(await ids("notes")).toEqual([a]);
    await alice.as.mutation(api.notes.setPinned, { id: c, pinned: true });
    expect(await ids("archive")).toEqual([b]);
  });

  test("the list is newest edit first", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000_000);
      const { _id: a } = await alice.as.mutation(api.notes.create, { title: "a" });
      vi.setSystemTime(2_000_000);
      const { _id: b } = await alice.as.mutation(api.notes.create, { title: "b" });
      vi.setSystemTime(3_000_000);
      await alice.as.mutation(api.notes.save, { id: a, title: "a2", body: "", baseVersion: 1 });
      const list = await alice.as.query(api.notes.list, { view: "notes", paginationOpts: page });
      expect(list.page.map((n) => n._id)).toEqual([a, b]);
    } finally {
      vi.useRealTimers();
    }
  });

  test("a tag and search cover every view, trash included", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const tag = await alice.as.mutation(api.tags.create, { name: "Work" });
    const make = async (body: string) =>
      (await alice.as.mutation(api.notes.create, { body, tagIds: [tag] }))._id;
    const live = await make("quarterly report");
    const kept = await make("archived report");
    const gone = await make("old report");
    await alice.as.mutation(api.notes.setArchived, { id: kept, archived: true });
    await alice.as.mutation(api.notes.trash, { id: gone });

    const byTag = await alice.as.query(api.notes.byTag, { tagId: tag, paginationOpts: page });
    expect(byTag.page.map((n) => n._id)).toEqual([gone, kept, live]);

    const found = await alice.as.query(api.notes.search, { query: "report", paginationOpts: page });
    expect(found.page.map((n) => n._id).sort()).toEqual([live, kept, gone].sort());
    expect(
      (await alice.as.query(api.notes.search, { query: "  ", paginationOpts: page })).page,
    ).toEqual([]);
  });

  test("tag and search results page through every match", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const tag = await alice.as.mutation(api.tags.create, { name: "Many" });
    for (let i = 0; i < 7; i++) {
      await alice.as.mutation(api.notes.create, { body: `report ${i}`, tagIds: [tag] });
    }
    async function all(
      fetch: (
        cursor: string | null,
      ) => Promise<{ page: unknown[]; isDone: boolean; continueCursor: string }>,
    ) {
      let cursor: string | null = null;
      let count = 0;
      for (;;) {
        const r = await fetch(cursor);
        count += r.page.length;
        if (r.isDone) return count;
        cursor = r.continueCursor;
      }
    }
    const small = (cursor: string | null) => ({ numItems: 3, cursor });
    expect(
      await all((c) => alice.as.query(api.notes.byTag, { tagId: tag, paginationOpts: small(c) })),
    ).toBe(7);
    expect(
      await all((c) =>
        alice.as.query(api.notes.search, { query: "report", paginationOpts: small(c) }),
      ),
    ).toBe(7);
  });
});

describe("trash", () => {
  test("trash, restore, and delete forever only from the trash", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const tag = await alice.as.mutation(api.tags.create, { name: "t" });
    const { _id } = await alice.as.mutation(api.notes.create, { body: "x", tagIds: [tag] });
    await alice.as.mutation(api.notes.setPinned, { id: _id, pinned: true });

    await expect(alice.as.mutation(api.notes.restore, { id: _id })).rejects.toThrow("notInTrash");
    await expect(alice.as.mutation(api.notes.deleteForever, { id: _id })).rejects.toThrow(
      "notInTrash",
    );

    await alice.as.mutation(api.notes.trash, { id: _id });
    const trashed = await alice.as.query(api.notes.get, { id: _id });
    expect(trashed.deletedAt).toBeTypeOf("number");
    expect(trashed.pinned).toBe(false);
    // Pinning a trashed note does nothing.
    await alice.as.mutation(api.notes.setPinned, { id: _id, pinned: true });
    expect((await alice.as.query(api.notes.get, { id: _id })).pinned).toBe(false);

    await alice.as.mutation(api.notes.restore, { id: _id });
    expect((await alice.as.query(api.notes.get, { id: _id })).deletedAt).toBeUndefined();

    await alice.as.mutation(api.notes.trash, { id: _id });
    await alice.as.mutation(api.notes.deleteForever, { id: _id });
    await expect(alice.as.query(api.notes.get, { id: _id })).rejects.toThrow("noteNotFound");
    expect(await joinRows(t)).toEqual([]);
  });

  test("empty trash deletes only trashed notes", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const bob = await signedInUser(t, "bob@example.com");
    const { _id: keep } = await alice.as.mutation(api.notes.create, { body: "keep" });
    const { _id: bobTrashed } = await bob.as.mutation(api.notes.create, { body: "bob" });
    await bob.as.mutation(api.notes.trash, { id: bobTrashed });
    for (let i = 0; i < 3; i++) {
      const { _id } = await alice.as.mutation(api.notes.create, { body: `junk ${i}` });
      await alice.as.mutation(api.notes.trash, { id: _id });
    }
    await alice.as.mutation(api.notes.emptyTrash, {});
    const left = await t.run((ctx) => ctx.db.query("notes").collect());
    expect(left.map((n) => n._id).sort()).toEqual([keep, bobTrashed].sort());
  });

  test("the purge deletes notes trashed over 30 days ago, their noteTags, and nothing else", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const tag = await alice.as.mutation(api.tags.create, { name: "t" });
    const make = async (body: string) =>
      (await alice.as.mutation(api.notes.create, { body, tagIds: [tag] }))._id;
    const live = await make("live");
    const recent = await make("recent");
    const old = await make("old");
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.patch("notes", recent, { deletedAt: now - 29 * DAY });
      await ctx.db.patch("notes", old, { deletedAt: now - 31 * DAY });
    });

    await t.mutation(internal.notes.purgeTrash, {});

    const left = await t.run((ctx) => ctx.db.query("notes").collect());
    expect(left.map((n) => n._id).sort()).toEqual([live, recent].sort());
    expect((await joinRows(t)).map((r) => r.noteId).sort()).toEqual([live, recent].sort());
    expect(await alice.as.query(api.tags.list, {})).toMatchObject([{ name: "t", count: 2 }]);
  });
});

describe("tags", () => {
  test("names are unique per user, ignoring case, and stored trimmed", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const bob = await signedInUser(t, "bob@example.com");
    const work = await alice.as.mutation(api.tags.create, { name: "  Work  " });
    await expect(alice.as.mutation(api.tags.create, { name: "work" })).rejects.toThrow(
      "tagNameTaken",
    );
    const home = await alice.as.mutation(api.tags.create, { name: "Home" });
    await expect(alice.as.mutation(api.tags.rename, { id: home, name: "WORK" })).rejects.toThrow(
      "tagNameTaken",
    );
    // Renaming a tag to a different case of its own name is fine.
    await alice.as.mutation(api.tags.rename, { id: work, name: "WORK" });
    // Another user can use the same name.
    await bob.as.mutation(api.tags.create, { name: "work" });
    expect((await alice.as.query(api.tags.list, {})).map((t) => t.name).sort()).toEqual([
      "Home",
      "WORK",
    ]);
  });

  test("deleting a tag removes it from notes and the join table, and keeps the notes", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const a = await alice.as.mutation(api.tags.create, { name: "a" });
    const b = await alice.as.mutation(api.tags.create, { name: "b" });
    const { _id } = await alice.as.mutation(api.notes.create, { body: "x", tagIds: [a, b] });
    expect(await joinRows(t)).toHaveLength(2);

    await alice.as.mutation(api.tags.remove, { id: a });

    expect((await alice.as.query(api.notes.get, { id: _id })).tagIds).toEqual([b]);
    expect((await joinRows(t)).map((r) => r.tagId)).toEqual([b]);
    expect(await alice.as.query(api.tags.list, {})).toMatchObject([{ name: "b", count: 1 }]);
  });

  test("setTags keeps the join table in step", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const a = await alice.as.mutation(api.tags.create, { name: "a" });
    const b = await alice.as.mutation(api.tags.create, { name: "b" });
    const { _id } = await alice.as.mutation(api.notes.create, { tagIds: [a] });
    await alice.as.mutation(api.notes.setTags, { id: _id, tagIds: [b, b] });
    expect((await alice.as.query(api.notes.get, { id: _id })).tagIds).toEqual([b]);
    expect((await joinRows(t)).map((r) => r.tagId)).toEqual([b]);
  });
});

describe("tag counts", () => {
  test("noteCount follows tagging, untagging, trash and delete forever", async () => {
    const t = newTest();
    const alice = await signedInUser(t, "alice@example.com");
    const a = await alice.as.mutation(api.tags.create, { name: "a" });
    const b = await alice.as.mutation(api.tags.create, { name: "b" });
    const counts = async () =>
      Object.fromEntries((await alice.as.query(api.tags.list, {})).map((x) => [x.name, x.count]));

    const { _id: n1 } = await alice.as.mutation(api.notes.create, { tagIds: [a, b] });
    const { _id: n2 } = await alice.as.mutation(api.notes.create, { tagIds: [a] });
    expect(await counts()).toEqual({ a: 2, b: 1 });

    await alice.as.mutation(api.notes.setTags, { id: n1, tagIds: [b] });
    expect(await counts()).toEqual({ a: 1, b: 1 });

    // Trashed notes keep their tags (the tag screen shows them).
    await alice.as.mutation(api.notes.trash, { id: n2 });
    expect(await counts()).toEqual({ a: 1, b: 1 });
    await alice.as.mutation(api.notes.deleteForever, { id: n2 });
    expect(await counts()).toEqual({ a: 0, b: 1 });

    await alice.as.mutation(api.notes.trash, { id: n1 });
    await alice.as.mutation(api.notes.emptyTrash, {});
    expect(await counts()).toEqual({ a: 0, b: 0 });
  });

  test("deleting a tag on more notes than one batch cleans up every note", async () => {
    vi.useFakeTimers();
    try {
      const t = newTest();
      const alice = await signedInUser(t, "alice@example.com");
      const tag = await alice.as.mutation(api.tags.create, { name: "big" });
      const keep = await alice.as.mutation(api.tags.create, { name: "keep" });
      for (let i = 0; i < 230; i++) {
        await alice.as.mutation(api.notes.create, { tagIds: [tag, keep] });
      }
      expect((await alice.as.query(api.tags.list, {})).map((x) => x.count)).toEqual([230, 230]);

      await alice.as.mutation(api.tags.remove, { id: tag });
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      const rows = await joinRows(t);
      expect(rows.every((r) => r.tagId === keep)).toBe(true);
      expect(rows).toHaveLength(230);
      const notes = await t.run((ctx) => ctx.db.query("notes").collect());
      expect(notes.every((n) => n.tagIds.length === 1 && n.tagIds[0] === keep)).toBe(true);
      expect(await alice.as.query(api.tags.list, {})).toEqual([
        expect.objectContaining({ name: "keep", count: 230 }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
