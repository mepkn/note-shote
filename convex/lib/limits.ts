// Shared by the server (enforcement) and the app (counter and input guard).
export const MAX_BODY_BYTES = 100 * 1024;
export const MAX_TITLE_CHARS = 200;
export const MAX_TAGS_PER_NOTE = 20;
export const MAX_TAG_NAME_CHARS = 50;
export const MAX_TAGS = 200; // per user
export const TRASH_DAYS = 30;

export function textBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}
