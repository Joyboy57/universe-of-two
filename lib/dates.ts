export const CATEGORIES = [
  { key: "movie", label: "Movie", icon: "🎬" },
  { key: "food", label: "Food", icon: "🍜" },
  { key: "outing", label: "Outing", icon: "🌳" },
  { key: "trip", label: "Trip", icon: "✈️" },
  { key: "call", label: "Call", icon: "📞" },
  { key: "celebration", label: "Celebration", icon: "🎂" },
  { key: "other", label: "Other", icon: "💞" },
] as const;

export type Category = (typeof CATEGORIES)[number]["key"];
export const CATEGORY_KEYS: string[] = CATEGORIES.map((c) => c.key);

export const ICON_CHOICES = [
  "🎬", "🍜", "🌳", "✈️", "📞", "🎂", "💞", "❤️", "☕", "🍷", "🍕", "🎶",
  "🎮", "📸", "🛍️", "🏖️", "⛺", "🚗", "🎡", "🏠", "🌹", "🎁", "💌", "🌙",
];

export type DateEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  icon: string | null;
  notes: string | null;
  location: string | null;
  rating: number | null;
  created_by: string;
  end_date: string | null; // last day of a multi-day visit
  in_person: boolean;
};

export const categoryIcon = (category: string) =>
  CATEGORIES.find((c) => c.key === category)?.icon ?? "💞";

export const iconFor = (e: { icon: string | null; category: string }) =>
  e.icon || categoryIcon(e.category);

export const pad = (n: number) => String(n).padStart(2, "0");
/** month is 0-based */
export const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function isValidKey(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function fmtLong(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** whole days from a to b (positive if b is later) */
export const diffDays = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
export const spanDays = (e: { date: string; end_date: string | null }) =>
  e.end_date ? diffDays(e.date, e.end_date) + 1 : 1;

export function fmtShort(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}
