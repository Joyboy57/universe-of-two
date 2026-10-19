import { addDays, diffDays, type DateEntry } from "@/lib/dates";

/** Every calendar day -> the dates that touch it (multi-day visits appear on each of their days). */
export function indexDays(entries: DateEntry[]) {
  const map = new Map<string, DateEntry[]>();
  for (const e of entries) {
    const n = e.end_date ? Math.min(diffDays(e.date, e.end_date), 120) : 0;
    for (let i = 0; i <= n; i++) {
      const key = i === 0 ? e.date : addDays(e.date, i);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
  }
  return map;
}

/** "YYYY-MM" -> how many dates start in that month */
export function monthCounts(entries: DateEntry[]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    const k = e.date.slice(0, 7);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}
