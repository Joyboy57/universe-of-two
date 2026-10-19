import Link from "next/link";
import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { MONTHS, fmtShort, iconFor, spanDays, type DateEntry } from "@/lib/dates";
import { localParts } from "@/lib/notify";
import { MemoriesTabs } from "@/components/MemoriesTabs";

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const { me } = await getSpace();
  if (!me) return null;

  const supabase = await supabaseServer();
  const { data: all } = await supabase.from("dates").select("date").limit(5000);
  const years = [...new Set((all ?? []).map((d) => d.date.slice(0, 4)))].sort().reverse();
  const thisYear = localParts(me.timezone, new Date()).date.slice(0, 4);
  const year = yearParam && years.includes(yearParam) ? yearParam : years.includes(thisYear) ? thisYear : years[0];

  if (!year) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-3xl font-semibold">Memories</h1>
        <MemoriesTabs active="timeline" />
        <p className="text-[var(--ink-soft)]">Your story will appear here as you add dates.</p>
        <Link href="/dates/new" className="btn">Add your first date</Link>
      </main>
    );
  }

  const { data } = await supabase
    .from("dates")
    .select("id, date, end_date, title, category, icon, notes, location, rating, created_by, in_person")
    .gte("date", `${year}-01-01`).lte("date", `${year}-12-31`)
    .order("date", { ascending: false }).limit(400);
  const entries = (data ?? []) as DateEntry[];

  // First photo of each date as its cover (joined, so the request stays small)
  const { data: media } = await supabase
    .from("media")
    .select("date_id, thumb_key, created_at, dates!inner(date)")
    .gte("dates.date", `${year}-01-01`).lte("dates.date", `${year}-12-31`)
    .order("created_at", { ascending: true }).limit(3000);

  const coverKey = new Map<string, string>();
  const mediaCount = new Map<string, number>();
  for (const m of media ?? []) {
    mediaCount.set(m.date_id, (mediaCount.get(m.date_id) ?? 0) + 1);
    if (m.thumb_key && !coverKey.has(m.date_id)) coverKey.set(m.date_id, m.thumb_key);
  }
  const urlFor = new Map<string, string>();
  const keys = [...coverKey.values()];
  if (keys.length) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrls(keys, 7200);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlFor.set(s.path, s.signedUrl);
  }

  const today = localParts(me.timezone, new Date()).date;
  const months: { key: string; items: DateEntry[] }[] = [];
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(e);
    else months.push({ key, items: [e] });
  }

  return (
    <main className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Memories</h1>
      <MemoriesTabs active="timeline" />

      <nav aria-label="Year" className="flex flex-wrap gap-2">
        {years.map((y) => (
          <Link key={y} href={`/timeline?year=${y}`} className="chip" aria-pressed={y === year} aria-current={y === year ? "page" : undefined}>{y}</Link>
        ))}
      </nav>

      <ol className="relative ml-3 space-y-8 border-l-2 border-[var(--line)] pl-6">
        {months.map((m) => (
          <li key={m.key} className="space-y-3">
            <h2 className="font-display text-xl font-semibold">{MONTHS[Number(m.key.slice(5, 7)) - 1]} {year}</h2>
            <ul className="space-y-3">
              {m.items.map((e) => {
                const cover = coverKey.get(e.id) ? urlFor.get(coverKey.get(e.id)!) : undefined;
                const n = mediaCount.get(e.id) ?? 0;
                const upcoming = e.date > today;
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[2.15rem] top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#2b1c2b] text-sm ring-2 ring-[var(--line)]" aria-hidden="true">{iconFor(e)}</span>
                    <Link href={`/dates/${e.id}`} className={`card flex gap-4 !p-3 transition-transform hover:-translate-y-0.5 ${upcoming ? "!border-dashed !border-[var(--accent-deep)]" : ""}`}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[var(--inset)] text-3xl" aria-hidden="true">{iconFor(e)}</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.title}</span>
                        <span className="block text-sm text-[var(--ink-soft)]">
                          {fmtShort(e.date)}{e.end_date && e.end_date !== e.date ? ` · ${spanDays(e)} days` : ""}{upcoming ? " · coming up" : ""}
                        </span>
                        <span className="mt-1 block truncate text-sm text-[var(--ink-soft)]">
                          {[e.in_person ? "♥ together" : null, e.location, n ? `${n} ${n === 1 ? "photo/video" : "photos/videos"}` : null].filter(Boolean).join(" · ")}
                        </span>
                        {e.rating ? <span className="text-sm text-[var(--accent-deep)]" aria-label={`${e.rating} stars`}>{"★".repeat(e.rating)}</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
