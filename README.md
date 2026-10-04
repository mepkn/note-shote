# note-shote

A private Markdown notes app: many notes, each with a title, a Markdown body and tags, synced
live between an Android phone and the web at <https://note-shote.pknspace.com>. Only
allowlisted emails can sign in.

Platforms: web (static export on the VPS) and Android (sideloaded APK).

## Features

- Note list: pinned notes first, then newest edit first. Title (or the body's first line),
  a plain-text preview, tags and the relative edit time.
- Server-side search, a tag filter (one tag at a time, or All), and Notes / Archive / Trash views.
- Notes open in view mode (rendered GFM). Tap Edit (or the body, on Android) to edit.
  - Android: rich editor with Markdown shortcuts (`# `, `- `, `1. `) and a format toolbar.
  - Web: raw Markdown in a monospace box; Preview switches back to the rendered view.
- Autosave about 500 ms after typing stops, with a Saving… / Saved / Offline label.
- Pin, archive, tags, copy Markdown, move to trash. Trash: restore, delete forever, empty trash.
  Notes in the trash for more than 30 days are deleted by a daily cron.
- Tags are created from a note's tag picker; rename and delete them in Settings.
- Limits (server-enforced): 100 KB body (UTF-8 bytes), 200-char title, 20 tags per note,
  50-char tag names.
- Light, dark or system theme.

## Stack

Expo (SDK 57) · Expo Router · TypeScript · NativeWind + React Native Reusables ·
Convex (database, auth, search, cron) · Convex Auth (password) ·
`react-native-enriched-markdown` 1.1 (rendering and the Android editor).

## Development

Requires Node 22.18+ (`.nvmrc` pins 22).

### 1. Install and run Convex locally

```sh
npm install               # don't use --ignore-scripts: enriched-markdown's postinstall fetches native assets
npx convex dev            # first run: choose a local deployment (no account needed)
```

This writes `EXPO_PUBLIC_CONVEX_URL` to `.env.local`. Keep it running; it redeploys whenever `convex/` changes.

> **Phone vs. local backend:** `127.0.0.1` on a phone is the phone itself.
> - **Android emulator:** set `EXPO_PUBLIC_CONVEX_URL=http://10.0.2.2:<port>`.
> - **USB device:** `adb reverse tcp:<port> tcp:<port>` for the cloud and site ports in `.env.local`.
> - **Device on the same Wi-Fi:** use your computer's LAN IP.
>
> Restart Metro after changing `.env.local`.

### 2. Configure Convex Auth (once per deployment)

```sh
npx @convex-dev/auth      # interactive: generates JWT_PRIVATE_KEY + JWKS
npx convex env set SITE_URL http://localhost:8081
npx convex env set ALLOWED_EMAILS you@example.com   # comma-separated; nobody else can sign up or sign in
```

`ALLOWED_EMAILS` fails closed: if it's unset, every sign-up, sign-in and API call is refused.

### 3. Run the app

The Android editor is a native module, so Android needs a **development build** (not Expo Go).

```sh
npm run web                      # browser
npm run android                  # build and install a development build on a USB phone
npx expo start --dev-client      # Metro for the development build
```

## Scripts

| Command | What it does |
|---|---|
| `npx convex dev` | Local Convex backend with hot reload |
| `npm run web` | Metro for the browser |
| `npm run android` | Build and install the development build on a USB phone |
| `npm run typecheck` | App and `convex/` typecheck |
| `npm run lint` | ESLint (Expo config) |
| `npm test` | convex-test (allowlist, ownership, limits, versions, search, trash, purge, tags) and the editor-compat detector |
| `npm run check` | Typecheck, lint and tests |
| `npm run icons` | Regenerate the app icon and splash images |
| `npm run build:web` | Static web export into `dist/web/` |
| `npm run deploy:backend` | Checks, then deploys `convex/` to production |
| `npm run deploy:web` | Checks, exports the web app, rsyncs `dist/web/` to the VPS |
| `npm run deploy:web:dry` | The same, but rsync only shows what would change |
| `npm run build:android:preview` | Installable APK, built on EAS cloud |
| `npm run build:android:preview:local` | The same APK, built on this Mac into `dist/` |
| `npm run build:android:production` | Play Store AAB on EAS cloud |
| `npm run build:android:production:local` | The same AAB, built locally into `dist/` |
| `npm run eas -- <args>` | Any other `eas` command as the personal account |

## Deployment

Three parts: the Convex production deployment `decisive-mockingbird-534`
(`https://decisive-mockingbird-534.convex.cloud`, project `note-shote`), the static web app on
the VPS, and the Android app built with EAS under the personal Expo account.

### One-time setup (done, except the VPS and EAS)

- `.env.prod.local` (git-ignored) holds `CONVEX_DEPLOY_KEY`, the production `EXPO_PUBLIC_CONVEX_URL`
  and `DEPLOY_HOST` / `DEPLOY_PORT` / `DEPLOY_DIR`. See `.env.example`. The scripts read it
  line by line as literal `KEY=VALUE`; it is never sourced.
- `.eas-token` (git-ignored) holds `export EXPO_TOKEN=...` for the personal Expo account. The scripts read it, so the global `eas` login is never used or changed.
- On the production Convex deployment: `JWT_PRIVATE_KEY`, `JWKS` (`npx @convex-dev/auth --prod`),
  `SITE_URL=noteshote://` and `ALLOWED_EMAILS`.
- `npx eas-cli init` (via `npm run eas -- init`) links the EAS project and writes `extra.eas.projectId`;
  the EAS environments `preview` and `production` need `EXPO_PUBLIC_CONVEX_URL` set to the production URL.
- VPS: `DEPLOY_DIR=/var/www/note-shote`, owned by the deploy user. System Caddy block:

  ```caddy
  http://note-shote.pknspace.com:8080 {
        root * /var/www/note-shote
        try_files {path} {path}.html /index.html
        encode gzip
        file_server
  }
  ```

  `{path}.html` is needed because Expo's static export writes routes as `note.html` etc. The
  note screen is `/note?id=…` (a fixed route, not `note/[id]`), so no extra rule is needed.
  A cloudflared Public Hostname maps `note-shote.pknspace.com` → `http://localhost:8080`.

### Backend

```sh
npm run deploy:backend    # checks, then npx convex deploy to production
```

### Web

```sh
npm run deploy:web:dry    # see what would change
npm run deploy:web        # checks, export, rsync --delete; Caddy serves it immediately
```

### Android

```sh
npm run build:android:preview:local
adb install -r dist/note-shote-preview-*.apk
```

## How it works

- **The app** (`src/`) uses Expo Router, NativeWind and React Native Reusables. The RNR primitives live in `src/components/ui/`, and screens only use the app's own wrappers in `src/components/cmp/cmp-*.tsx` (plus composites built from them: `note-row`, `tag-picker`, `auth-form`). All strings are in `src/lib/strings.ts`.
- **Convex** (`convex/`) is the entire backend.
  - `schema.ts`: `notes`, `tags`, `noteTags` (the join table mirroring `notes.tagIds`), plus the Convex Auth tables.
  - `auth.ts`: Convex Auth with the Password provider. `profile()` runs for sign-up and sign-in before anything is stored and refuses emails not in `ALLOWED_EMAILS` with a generic `notAllowed`. `lib/access.ts` `requireUserId` re-checks the list on every call, so removing an email also ends that user's sessions. `getOwnedNote` / `getOwnedTag` give the same error for missing and foreign ids.
  - `notes.ts`: list, pinned, search, get, create, save (last write wins; `version` bumps, a stale `baseVersion` still saves), setTags, setPinned, setArchived, trash, restore, deleteForever, emptyTrash, and the internal `purgeTrash` run daily by `crons.ts`. `searchText` (`title + "\n" + body`) is rewritten on every save.
  - `tags.ts`: list (with note counts), create, rename, remove. Names are trimmed and unique per user ignoring case.
  - `users.ts`: `me`, for the email in Settings.
- **Sync** (`src/lib/use-note.ts`). Edits are saved 500 ms after typing stops, and immediately when a field loses focus. A subscription result is applied only while neither the title nor the body is focused and there are no unsaved or in-flight edits, so a remote value never lands in a focused editor; results older than the last saved version are ignored. `/note` without an id creates the note on the first save.
- **Auth tokens** are kept in `expo-secure-store` on Android and `localStorage` on web.

### Index design: pinned in the index

The spec allowed either a separate pinned query over the spec'd index or adding `pinned` to it.
`notes.pinned()` over `["userId","archived","deletedAt","updatedAt"]` would scan every live note
to find the pinned ones, so the index is `by_user_state_pinned_updated`:
`["userId", "archived", "deletedAt", "pinned", "updatedAt"]`. With two invariants every view is a
single index range, ordered by `updatedAt`:

- a pinned note is never archived (archiving unpins, pinning unarchives);
- a trashed note is neither pinned nor archived (restoring it brings it back to Notes).

| Query | Range |
|---|---|
| Notes (paginated) | `userId, archived=false, deletedAt=unset, pinned=false`, desc |
| `pinned()` | `userId, archived=false, deletedAt=unset, pinned=true`, desc |
| Archive | `userId, archived=true, deletedAt=unset, pinned=false`, desc |
| Trash | `userId, archived=false, deletedAt ≥ 0`, desc (most recently trashed first) |
| Tag filter | `noteTags.by_tag`, then the notes; one page, pinned first then newest |
| Search | `search_text` filtered by user/archived/deletedAt; trash search reads 256 matches and keeps trashed ones |
| Purge | `by_deleted`, `0 ≤ deletedAt < now − 30 days`, 100 per batch, reschedules while full |

## Editor round-trip

`EnrichedMarkdownTextInput` (Android) only models paragraphs, H1–H6, single-line nested
bullet/numbered lists, and bold / italic / underline / strikethrough / links (plus spoilers).
Loading Markdown into it parses with md4c and keeps only those; `getMarkdown()` serializes them back.

`src/lib/roundtrip-sample.ts` covers every GFM feature, and the dev-only `/roundtrip` screen loads
it into the input, serializes it and shows each line before → after.

**Status: confirmed on a Samsung SM-E066B** (development build, library 1.1.0). Output of
`getMarkdown()` after loading the sample:

| Feature | Survives? |
|---|---|
| `#`–`######` headings, paragraphs | Yes (a blank line is added between adjacent headings) |
| `**bold**`, `*italic*`, `~~strike~~`, `***both***`, `[text](url)` | Yes |
| `_x_` | Read as **underline** and written back as `_x_`. The viewer uses md4c's underline flag too, so `_x_` means underline everywhere in this app. |
| Bullet / numbered lists, nested | Yes (3-space indent; a blank line is added between a bullet list and a following numbered list) |
| Soft line breaks inside a paragraph | Kept |
| Multi-paragraph ("loose") list items | **No, and lossy**: the continuation is glued onto the item with no space (`- loose itemcontinuation paragraph`) |
| Blockquotes | No: `>` lost, text becomes a paragraph |
| Fenced code | No: fences lost, code becomes a paragraph |
| Inline code | No: backticks lost |
| Backslash escapes | No: `\*star\*` comes back as `*star*` (which then renders as italic) |
| Tables | **No, and lossy**: cell text is concatenated (`ab12`) |
| Task lists | No: `[ ]` / `[x]` lost, items stay as bullets |
| Thematic breaks | Dropped |
| Images | Replaced by their alt text |

**What the app does about it** (`src/lib/markdown-compat.ts`): when you start editing on Android,
a body containing fenced or indented code, tables, blockquotes, task lists, multi-paragraph list
items, thematic breaks, images, inline code, HTML, backslash escapes or setext headings is edited
as raw Markdown (the web editor), with a notice. The rich editor also only reports changes while
it's focused, so merely opening a note never rewrites it.

## Not in v1

Sharing or public links, checklist editing, images and attachments, offline edits, version
history, folders, math, video, iOS builds. The optional Android share target was not built.
