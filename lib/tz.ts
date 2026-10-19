export type Snap = { time: string; weekday: string; hour: number; minutes: number };

function safeTz(tz: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return "UTC"; }
}

/** Wall-clock time in any IANA timezone, e.g. "Asia/Kolkata". */
export function timeIn(tz: string, at: Date): Snap {
  const zone = safeTz(tz);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(at);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(at);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { time, weekday, hour, minutes: hour * 60 + minute };
}

/** Minutes that `tz` is ahead of UTC at this moment (handles daylight saving). */
export function tzOffsetMin(tz: string, at: Date) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz), hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(at)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

export function partOfDay(hour: number) {
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/** 0 at night, up to 1 at midday. `hours` can be fractional (14.5 = 2:30 PM). */
export function daylight(hours: number) {
  const x = (hours - 6) / 12;
  return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x);
}

export function fmtDiff(minutes: number) {
  const m = Math.abs(minutes);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return [h ? `${h}h` : "", r ? `${r}m` : ""].filter(Boolean).join(" ");
}
