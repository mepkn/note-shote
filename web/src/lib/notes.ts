import type { Id } from "@convex/_generated/dataModel";

export type View = "notes" | "archive" | "trash";

/** What the note list shows: one view, or every note with a tag. Search overrides both. */
export type Source = { kind: "view"; view: View } | { kind: "tag"; tagId: Id<"tags"> };

export const PAGE_SIZE = 30;

export function sameSource(a: Source, b: Source): boolean {
  if (a.kind === "view" && b.kind === "view") return a.view === b.view;
  if (a.kind === "tag" && b.kind === "tag") return a.tagId === b.tagId;
  return false;
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "5 minutes ago", "yesterday", or "just now" under a minute. */
export function timeAgo(ms: number, now = Date.now()): string {
  const seconds = Math.round((ms - now) / 1000);
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
}
