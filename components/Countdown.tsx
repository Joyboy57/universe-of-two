import Link from "next/link";
import { fmtShort, iconFor } from "@/lib/dates";
import type { Meetup } from "@/lib/stats";

export function Countdown({ meetup, sinceLast, progress }: { meetup: Meetup; sinceLast: number | null; progress: number | null }) {
  if (meetup?.kind === "now") {
    return (
      <Link href={`/dates/${meetup.entry.id}`} className="card block w-full max-w-md space-y-1 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Together now <span className="beat" aria-hidden="true">♥</span></p>
        <p className="font-display text-4xl font-semibold">Day {meetup.day} of {meetup.total}</p>
        <p className="text-[var(--ink-soft)]"><span aria-hidden="true">{iconFor(meetup.entry)}</span> {meetup.entry.title}</p>
      </Link>
    );
  }

  if (meetup?.kind === "next") {
    const pct = progress === null ? null : Math.round(progress * 100);
    return (
      <Link href={`/dates/${meetup.entry.id}`} className="card block w-full max-w-md space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Until you're together</p>
        <p className="font-display text-6xl font-semibold leading-none">
          {meetup.days} <span className="text-2xl">{meetup.days === 1 ? "day" : "days"}</span>
        </p>
        <p className="text-[var(--ink-soft)]"><span aria-hidden="true">{iconFor(meetup.entry)}</span> {meetup.entry.title} · {fmtShort(meetup.entry.date)}</p>
        {pct !== null && (
          <div className="pt-1">
            <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="How far through the time apart" className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-deep))" }} />
            </div>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">{pct}% of the way there</p>
          </div>
        )}
        {sinceLast !== null && <p className="text-xs text-[var(--ink-soft)]">{sinceLast} {sinceLast === 1 ? "day" : "days"} since you last saw each other</p>}
      </Link>
    );
  }

  return (
    <div className="card w-full max-w-md space-y-3 text-center">
      <p className="font-display text-2xl font-semibold">No visit planned yet</p>
      {sinceLast !== null && <p className="text-sm text-[var(--ink-soft)]">{sinceLast} {sinceLast === 1 ? "day" : "days"} since you last saw each other</p>}
      <p className="text-[var(--ink-soft)]">Having a date to look forward to helps. Pick one together.</p>
      <Link href="/dates/new?inperson=1" className="btn">Plan your next visit</Link>
    </div>
  );
}
