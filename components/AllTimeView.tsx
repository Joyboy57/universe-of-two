"use client";
import { useMemo } from "react";
import { MONTHS, MONTHS_SHORT, type DateEntry } from "@/lib/dates";

type Props = {
  entries: DateEntry[];
  counts: Map<string, number>;
  today: string;
  startDate: string | null;
  onPickYear: (y: number) => void;
  onPickMonth: (y: number, m: number) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function AllTimeView({ entries, counts, today, startDate, onPickYear, onPickMonth }: Props) {
  const { years, past } = useMemo(() => {
    const thisYear = Number(today.slice(0, 4));
    const ys = entries.map((e) => Number(e.date.slice(0, 4)));
    if (startDate) ys.push(Number(startDate.slice(0, 4)));
    const min = Math.min(thisYear, ...ys);
    const max = Math.max(thisYear, ...ys);
    const list: number[] = [];
    for (let y = Math.max(min, max - 29); y <= max; y++) list.push(y); // at most 30 rows
    const p = new Map<string, number>();
    for (const e of entries) if (e.date <= today) p.set(e.date.slice(0, 7), (p.get(e.date.slice(0, 7)) ?? 0) + 1);
    return { years: list, past: p };
  }, [entries, today, startDate]);

  const total = entries.length;
  const nowKey = today.slice(0, 7);

  return (
    <div>
      <div className="mb-4 text-center">
        <h2 className="font-display text-2xl font-semibold">All of us</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          {total === 0 ? "Add your first date and this fills in." : `${total} ${total === 1 ? "date" : "dates"} across ${years.length} ${years.length === 1 ? "year" : "years"}`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[19rem]">
          <div className="mb-1 grid grid-cols-[2.6rem_repeat(12,minmax(0,1fr))_2rem] gap-1 text-center text-[0.65rem] font-semibold text-[var(--ink-soft)]" aria-hidden="true">
            <span />
            {MONTHS_SHORT.map((m) => <span key={m}>{m[0]}</span>)}
            <span />
          </div>

          <div className="space-y-1">
            {[...years].reverse().map((y) => {
              const yearCount = MONTHS.reduce((n, _, m) => n + (counts.get(`${y}-${pad(m + 1)}`) ?? 0), 0);
              return (
                <div key={y} className="grid grid-cols-[2.6rem_repeat(12,minmax(0,1fr))_2rem] items-center gap-1">
                  <button type="button" onClick={() => onPickYear(y)} className="text-left text-xs font-semibold underline-offset-4 hover:underline" aria-label={`Open ${y}`}>{y}</button>
                  {MONTHS.map((name, m) => {
                    const key = `${y}-${pad(m + 1)}`;
                    const n = counts.get(key) ?? 0;
                    const planned = n > 0 && (past.get(key) ?? 0) === 0;
                    const isStart = startDate?.slice(0, 7) === key;
                    const style: React.CSSProperties = {
                      background: n === 0 ? "color-mix(in srgb, var(--line) 50%, transparent)"
                        : n === 1 ? "color-mix(in srgb, var(--accent) 60%, transparent)"
                        : n <= 3 ? "var(--accent)" : "var(--accent-deep)",
                    };
                    if (planned) { style.background = "transparent"; style.outline = "1.5px dashed var(--accent-deep)"; style.outlineOffset = "-1.5px"; }
                    if (key === nowKey) style.boxShadow = "0 0 0 2px var(--ink)";
                    return (
                      <button
                        key={key} type="button" onClick={() => onPickMonth(y, m)} style={style}
                        aria-label={`${name} ${y}, ${n} ${n === 1 ? "date" : "dates"}${isStart ? ", the month you got together" : ""}`}
                        className="relative aspect-square rounded-md"
                      >
                        {isStart && <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] text-[var(--ink)]" aria-hidden="true">♥</span>}
                      </button>
                    );
                  })}
                  <span className="text-right text-xs text-[var(--ink-soft)]">{yearCount || ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
        <span>Darker = more dates</span>
        <span>Dashed = still to come</span>
        <span>♥ = the month you got together</span>
      </p>
    </div>
  );
}
