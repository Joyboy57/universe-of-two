import { CATEGORIES, addDays, diffDays, spanDays, type DateEntry } from "@/lib/dates";

export type Meetup =
  | { kind: "now"; entry: DateEntry; day: number; total: number }
  | { kind: "next"; entry: DateEntry; days: number }
  | null;

/** Are you together right now, or when is the next in-person visit? */
export function meetupStatus(entries: DateEntry[], today: string): Meetup {
  const inPerson = entries.filter((e) => e.in_person);
  const now = inPerson.find((e) => e.date <= today && (e.end_date ?? e.date) >= today);
  if (now) return { kind: "now", entry: now, day: diffDays(now.date, today) + 1, total: spanDays(now) };
  const next = inPerson.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];
  return next ? { kind: "next", entry: next, days: diffDays(today, next.date) } : null;
}

export function lastTogetherEnd(entries: DateEntry[], today: string) {
  let best: string | null = null;
  for (const e of entries) {
    if (!e.in_person) continue;
    const end = e.end_date ?? e.date;
    if (end < today && (!best || end > best)) best = end;
  }
  return best;
}

/** 0 to 1: how far through the time apart you are (from last goodbye to next hello). */
export function journeyProgress(entries: DateEntry[], today: string, m: Meetup) {
  if (!m || m.kind !== "next") return null;
  const last = lastTogetherEnd(entries, today);
  if (!last) return null;
  const total = diffDays(last, m.entry.date);
  if (total <= 0) return null;
  return Math.min(1, Math.max(0, diffDays(last, today) / total));
}

export type Stats = {
  daysAsCouple: number | null;
  inPersonDays: number;
  visits: number;
  sinceLast: number | null;
  longestApart: number | null;
  avgBetweenVisits: number | null;
  pastTotal: number;
  planned: number;
  byCategory: Record<string, number>;
  busiest: { key: string; n: number } | null;
  byYear: { year: string; n: number }[];
  topRated: DateEntry[];
  meetup: Meetup;
};

export function computeStats(entries: DateEntry[], today: string, startDate: string | null): Stats {
  const past = entries.filter((e) => e.date <= today);
  const inPerson = past.filter((e) => e.in_person);

  // Merge overlapping visits so days are never counted twice
  const clip = (e: DateEntry): [string, string] => {
    const end = e.end_date ?? e.date;
    return [e.date, end < today ? end : today];
  };
  const ranges = inPerson.map(clip).sort((a, b) => a[0].localeCompare(b[0]));
  const merged: [string, string][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && diffDays(last[1], r[0]) <= 1) {
      if (r[1] > last[1]) last[1] = r[1];
    } else merged.push([r[0], r[1]]);
  }

  let inPersonDays = 0;
  for (const [a, b] of merged) inPersonDays += diffDays(a, b) + 1;

  const gaps: number[] = [];
  for (let i = 1; i < merged.length; i++) gaps.push(diffDays(merged[i - 1][1], merged[i][0]) - 1);

  const meetup = meetupStatus(entries, today);
  const lastEnd = merged.length ? merged[merged.length - 1][1] : null;
  const sinceLast = meetup?.kind === "now" || !lastEnd ? null : diffDays(lastEnd, today);
  const candidates = [...gaps, ...(sinceLast !== null ? [sinceLast] : [])];

  const byCategory: Record<string, number> = {};
  const byMonth = new Map<string, number>();
  const byYearMap = new Map<string, number>();
  for (const e of past) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    byMonth.set(e.date.slice(0, 7), (byMonth.get(e.date.slice(0, 7)) ?? 0) + 1);
    byYearMap.set(e.date.slice(0, 4), (byYearMap.get(e.date.slice(0, 4)) ?? 0) + 1);
  }
  let busiest: Stats["busiest"] = null;
  for (const [key, n] of byMonth) if (!busiest || n > busiest.n) busiest = { key, n };

  return {
    daysAsCouple: startDate ? Math.max(0, diffDays(startDate, today)) : null,
    inPersonDays,
    visits: inPerson.length,
    sinceLast,
    longestApart: candidates.length ? Math.max(...candidates) : null,
    avgBetweenVisits: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    pastTotal: past.length,
    planned: entries.length - past.length,
    byCategory,
    busiest,
    byYear: [...byYearMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([year, n]) => ({ year, n })),
    topRated: past.filter((e) => e.rating === 5).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    meetup,
  };
}

export const CATEGORY_PLURAL: Record<string, string> = {
  movie: "movies", food: "meals", outing: "outings", trip: "trips",
  call: "calls", celebration: "celebrations", other: "other moments",
};
export const categoryList = CATEGORIES.map((c) => ({ key: c.key, icon: c.icon }));
// (addDays re-exported for convenience in pages)
export { addDays };
