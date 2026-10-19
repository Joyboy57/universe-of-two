import { categoryIcon } from "@/lib/dates";

export type Prefs = {
  enabled: boolean; on_this_day: boolean; plans: boolean;
  random_memory: boolean; private_preview: boolean; daily_ritual: boolean; send_hour: number;
};
export const DEFAULT_PREFS: Prefs = {
  enabled: true, on_this_day: true, plans: true, random_memory: true, private_preview: false, daily_ritual: true, send_hour: 9,
};

export type Entry = { id: string; date: string; title: string; category: string; icon: string | null };
export type Pick = { kind: string; body: string; url: string; tag: string };

/** The person's own local date, clock and weekday, from their timezone. */
export function localParts(tz: string, now: Date) {
  const make = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
    });
  let fmt: Intl.DateTimeFormat;
  try { fmt = make(tz); } catch { fmt = make("UTC"); }
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    weekday: p.weekday, // "Sun" ... "Sat"
  };
}

export function inQuietHours(start: string | null, end: string | null, minutes: number) {
  if (!start || !end) return false;
  const toMin = (t: string) => { const [h, m] = t.split(":"); return Number(h) * 60 + Number(m); };
  const s = toMin(start), e = toMin(end);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e; // handles 22:00 to 07:00
}

const daysUntil = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const icon = (e: Entry) => e.icon || categoryIcon(e.category);

/** At most ONE gentle notification per person per day, highest priority first. */
export function pickNotification(entries: Entry[], localDate: string, weekday: string, prefs: Prefs, seed: string): Pick | null {
  const hide = prefs.private_preview;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Plans: today, tomorrow, one week, 30 days (trips only)
  if (prefs.plans) {
    const rules: [number, (e: Entry) => boolean, (e: Entry) => string][] = [
      [0, () => true, (e) => `${icon(e)} Today: ${e.title}`],
      [1, () => true, (e) => `${icon(e)} Tomorrow: ${e.title}`],
      [7, () => true, (e) => `${icon(e)} One week to go: ${e.title}`],
      [30, (e) => e.category === "trip", (e) => `${icon(e)} 30 days until ${e.title}`],
    ];
    for (const [days, ok, text] of rules) {
      const e = sorted.find((x) => daysUntil(localDate, x.date) === days && ok(x));
      if (e) return { kind: `plan-${days}`, body: hide ? "Something to look forward to is coming up ♥" : text(e), url: `/dates/${e.id}`, tag: "plan" };
    }
  }

  // 2. On this day in earlier years
  if (prefs.on_this_day) {
    const md = localDate.slice(5);
    const year = Number(localDate.slice(0, 4));
    const hits = sorted.filter((e) => e.date.slice(5) === md && Number(e.date.slice(0, 4)) < year);
    if (hits.length) {
      const e = hits[0];
      const years = year - Number(e.date.slice(0, 4));
      const more = hits.length > 1 ? ` (+${hits.length - 1} more)` : "";
      const text = `${icon(e)} ${years} ${years === 1 ? "year" : "years"} ago today: ${e.title}${more}`;
      return { kind: "on-this-day", body: hide ? "You have a memory from this day ♥" : text, url: `/dates/${e.id}`, tag: "memory" };
    }
  }

  // 3. Sundays: one random older memory
  if (prefs.random_memory && weekday === "Sun") {
    const old = sorted.filter((e) => daysUntil(e.date, localDate) > 30);
    if (old.length) {
      const e = old[hash(seed + localDate) % old.length];
      return { kind: "random-memory", body: hide ? "A memory is waiting for you ♥" : `${icon(e)} Remember “${e.title}”?`, url: `/dates/${e.id}`, tag: "memory" };
    }
  }
  return null;
}
