import Link from "next/link";
import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORIES, MONTHS, fmtShort, iconFor, type DateEntry } from "@/lib/dates";
import { localParts } from "@/lib/notify";
import { CATEGORY_PLURAL, computeStats } from "@/lib/stats";
import { MemoriesTabs } from "@/components/MemoriesTabs";

const num = (n: number) => n.toLocaleString();
const days = (n: number) => `${num(n)} ${n === 1 ? "day" : "days"}`;

function Big({ value, label }: { value: string; label: string }) {
  return (
    <div className="card !p-4 text-center">
      <p className="font-display text-3xl font-semibold leading-tight">{value}</p>
      <p className="text-sm text-[var(--ink-soft)]">{label}</p>
    </div>
  );
}

export default async function StatsPage() {
  const { me, couple } = await getSpace();
  if (!me || !couple) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("dates")
    .select("id, date, end_date, title, category, icon, notes, location, rating, created_by, in_person")
    .limit(5000);
  const entries = (data ?? []) as DateEntry[];
  const { data: files } = await supabase.from("media").select("type").limit(10000);
  const photos = (files ?? []).filter((f) => f.type === "image").length;
  const videos = (files ?? []).filter((f) => f.type === "video").length;

  const today = localParts(me.timezone, new Date()).date;
  const s = computeStats(entries, today, couple.start_date);
  const maxYear = Math.max(1, ...s.byYear.map((y) => y.n));

  return (
    <main className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Memories</h1>
      <MemoriesTabs active="stats" />

      {entries.length === 0 ? (
        <>
          <p className="text-[var(--ink-soft)]">Numbers appear once you have added a few dates.</p>
          <Link href="/dates/new" className="btn">Add a date</Link>
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Together">
            {s.daysAsCouple !== null && <Big value={num(s.daysAsCouple)} label="days as a couple" />}
            <Big value={num(s.inPersonDays)} label="days together in person" />
            <Big value={num(s.visits)} label={s.visits === 1 ? "visit" : "visits"} />
          </section>

          <section className="space-y-3" aria-labelledby="apart-h">
            <h2 id="apart-h" className="font-display text-xl font-semibold">The distance</h2>
            <div className="card space-y-2">
              {s.meetup?.kind === "now" && <p>You're together right now ♥ Day {s.meetup.day} of {s.meetup.total}.</p>}
              {s.meetup?.kind === "next" && <p>Next visit: <b>{days(s.meetup.days)}</b> away, <Link className="underline underline-offset-4" href={`/dates/${s.meetup.entry.id}`}>{s.meetup.entry.title}</Link> on {fmtShort(s.meetup.entry.date)}.</p>}
              {!s.meetup && <p>No visit planned yet. <Link className="underline underline-offset-4" href="/dates/new?inperson=1">Plan one</Link>.</p>}
              {s.sinceLast !== null && <p>Since you last saw each other: <b>{days(s.sinceLast)}</b>.</p>}
              {s.longestApart !== null && <p>Longest time apart: <b>{days(s.longestApart)}</b>.</p>}
              {s.avgBetweenVisits !== null && <p>Usual time between visits: <b>about {days(s.avgBetweenVisits)}</b>.</p>}
              {s.longestApart === null && s.visits === 0 && <p className="text-[var(--ink-soft)]">Mark a date as "in person" to see these.</p>}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="shared-h">
            <h2 id="shared-h" className="font-display text-xl font-semibold">What you've shared</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <li key={c.key} className="card !p-4">
                  <span className="text-2xl" aria-hidden="true">{c.icon}</span>
                  <p className="font-display text-2xl font-semibold">{num(s.byCategory[c.key] ?? 0)}</p>
                  <p className="text-sm text-[var(--ink-soft)]">{CATEGORY_PLURAL[c.key]}</p>
                </li>
              ))}
              <li className="card !p-4">
                <span className="text-2xl" aria-hidden="true">📸</span>
                <p className="font-display text-2xl font-semibold">{num(photos + videos)}</p>
                <p className="text-sm text-[var(--ink-soft)]">{num(photos)} photos, {num(videos)} videos</p>
              </li>
            </ul>
          </section>

          {(s.busiest || s.topRated.length > 0) && (
            <section className="space-y-3" aria-labelledby="hi-h">
              <h2 id="hi-h" className="font-display text-xl font-semibold">Highlights</h2>
              <div className="card space-y-3">
                {s.busiest && <p>Busiest month: <b>{MONTHS[Number(s.busiest.key.slice(5, 7)) - 1]} {s.busiest.key.slice(0, 4)}</b> with {s.busiest.n} {s.busiest.n === 1 ? "date" : "dates"}.</p>}
                {s.topRated.length > 0 && (
                  <div>
                    <p className="mb-2">Your 5-star days:</p>
                    <ul className="space-y-2">
                      {s.topRated.map((e) => (
                        <li key={e.id}><Link href={`/dates/${e.id}`} className="underline underline-offset-4"><span aria-hidden="true">{iconFor(e)}</span> {e.title}</Link> <span className="text-sm text-[var(--ink-soft)]">· {fmtShort(e.date)}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="space-y-3" aria-labelledby="yr-h">
            <h2 id="yr-h" className="font-display text-xl font-semibold">Year by year</h2>
            <ul className="card space-y-2">
              {s.byYear.map((y) => (
                <li key={y.year} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-semibold">{y.year}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                    <span className="block h-full rounded-full" style={{ width: `${(y.n / maxYear) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-deep))" }} />
                  </span>
                  <span className="w-8 text-right text-sm text-[var(--ink-soft)]">{y.n}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
