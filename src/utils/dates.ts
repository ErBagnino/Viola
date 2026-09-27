// Date helpers. The app thinks in Europe/Rome time by default.

export const DEFAULT_TZ = "Europe/Rome";

/** YYYY-MM-DD for "today" in the given time zone. */
export function todayKey(tz = DEFAULT_TZ, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function hourIn(tz = DEFAULT_TZ, now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(now)) % 24;
}

export function formatDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }, tz = DEFAULT_TZ) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", { timeZone: tz, ...opts }).format(date);
}

export function formatTime(d: string | Date, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function formatDateTime(d: string | Date, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function relativeTime(d: string | Date, now = new Date()) {
  const diff = (new Date(d).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number; done: boolean; totalMs: number };

export function countdownParts(target: Date | string, now = new Date()): Countdown {
  const ms = new Date(target).getTime() - now.getTime();
  const clamped = Math.max(0, ms);
  const s = Math.floor(clamped / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: ms <= 0,
    totalMs: ms,
  };
}

/** For yearly-recurring countdowns (birthdays, anniversaries): next occurrence. */
export function nextOccurrence(target: Date | string, recurringYearly: boolean, now = new Date()) {
  const t = new Date(target);
  if (!recurringYearly || t.getTime() > now.getTime()) return t;
  const next = new Date(t);
  next.setFullYear(now.getFullYear());
  if (next.getTime() <= now.getTime()) next.setFullYear(now.getFullYear() + 1);
  return next;
}

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function greetingFor(hour: number) {
  if (hour < 5) return "notte";
  if (hour < 12) return "mattina";
  if (hour < 18) return "pomeriggio";
  return "sera";
}

/** ISO timestamp for `days` days ago (request-time helper for server components). */
export function isoDaysAgo(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 86400_000).toISOString();
}

/** YYYY-MM-DD keys for the last `days` days, oldest first. */
export function lastDaysKeys(days: number, now = new Date()) {
  return Array.from({ length: days }, (_, i) => new Date(now.getTime() - (days - 1 - i) * 86400_000).toISOString().slice(0, 10));
}
