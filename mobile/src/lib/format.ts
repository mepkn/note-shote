import { useEffect, useState } from "react";
import { strings } from "./strings";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return strings.time.justNow;
  if (diff < HOUR) return strings.time.minutes(Math.floor(diff / MINUTE));
  if (diff < DAY) return strings.time.hours(Math.floor(diff / HOUR));
  if (diff < 2 * DAY) return strings.time.yesterday;
  if (diff < 7 * DAY) return strings.time.days(Math.floor(diff / DAY));
  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// The current time, refreshed every minute, for relative timestamps.
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(id);
  }, []);
  return now;
}
