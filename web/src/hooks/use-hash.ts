import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The URL hash without "#": the open note's id, so reloads and links keep it. */
export function useHash(): [string, (value: string) => void] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash.slice(1));
  const set = (value: string) => {
    if (value === window.location.hash.slice(1)) return;
    if (value) window.location.hash = value;
    else history.pushState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  return [hash, set];
}
