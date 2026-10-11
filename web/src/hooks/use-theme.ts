import { useSyncExternalStore } from "react";
import { storage } from "@/lib/storage";

export type ThemePreference = "light" | "dark" | "system";
type Theme = "light" | "dark";

const KEY = "theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

let preference: ThemePreference = readPreference();

function readPreference(): ThemePreference {
  const saved = storage.get(KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

function resolved(): Theme {
  if (preference === "system") return media.matches ? "dark" : "light";
  return preference;
}

function apply() {
  document.documentElement.classList.toggle("dark", resolved() === "dark");
  listeners.forEach((l) => l());
}

media.addEventListener("change", () => {
  if (preference === "system") apply();
});
apply();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  storage.set(KEY, next);
  apply();
}

/** The active theme ("light" | "dark") and the saved preference (which may be "system"). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, resolved);
  const pref = useSyncExternalStore(subscribe, () => preference);
  return { theme, preference: pref, setPreference: setThemePreference };
}
