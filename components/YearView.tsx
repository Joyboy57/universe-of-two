"use client";
import { useMemo } from "react";
import { MONTHS, MONTHS_SHORT, addDays, type DateEntry } from "@/lib/dates";

type Props = {
  year: number;
  index: Map<string, DateEntry[]>;
  counts: Map<string, number>;
  today: string;
  onPickMonth: (m: number) => void;
  onShift: (delta: number) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

function cellStyle(list: DateEntry[] | undefined, key: string, today: string): React.CSSProperties {
  const n = list?.length ?? 0;
  const style: React.CSSProperties = {
    background: n === 0 ? "color-mix(in srgb, var(--line) 55%, transparent)"
      : n === 1 ? "color-mix(in srgb, var(--accent) 80%, transparent)" : "var(--accent-deep)",
  };
  if (n > 0 && list!.every((e) => e.date > today)) {
    style.background = "transparent";
    style.outline = "1px dashed var(--accent-deep)";
    style.outlineOffset = "-1px";
  }
  if (key === today) style.boxShadow = "0 0 0 1.5px var(--ink)";
  return style;
}

export function YearView({ year, index, counts, today, onPickMonth, onShift }: Props) {
  const summary = useMemo(() => {
    let dates = 0;
    for (let m = 0; m < 12; m++) dates += counts.get(`${year}-${pad(m + 1)}`) ?? 0;
    let together = 0;
    const start = `${year}-01-01`;
    for (let i = 0; i < 366; i++) {
      const key = addDays(start, i);
      if (key.slice(0, 4) !== String(year)) break;
      if (key <= today && index.get(key)?.some((e) => e.in_person)) together++;
    }
    return { dates, together };
  }, [year, index, counts, today]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="btn btn-quiet !min-h-10 !px-4" onClick={() => onShift(-1)} aria-label="Previous year">‹</button>
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold">{year}</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            {summary.dates} {summary.dates === 1 ? "date" : "dates"} · {summary.together} {summary.together === 1 ? "day" : "days"} together
          </p>
        </div>
        <button type="button" className="btn btn-quiet !min-h-10 !px-4" onClick={() => onShift(1)} aria-label="Next year">›</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {MONTHS.map((name, m) => {
          const first = new Date(year, m, 1).getDay();
          const dim = new Date(year, m + 1, 0).getDate();
          const count = counts.get(`${year}-${pad(m + 1)}`) ?? 0;
          return (
            <button
              key={name} type="button" onClick={() => onPickMonth(m)}
              aria-label={`${name} ${year}, ${count} ${count === 1 ? "date" : "dates"}. Open month`}
              className="rounded-2xl border border-transparent p-2 text-left transition-colors hover:border-[var(--line)] hover:bg-[var(--inset)]"
            >
              <span className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-semibold">{MONTHS_SHORT[m]}</span>
                {count > 0 && <span className="text-[0.7rem] text-[var(--accent-deep)]">{count}</span>}
              </span>
              <span className="grid grid-cols-7 gap-[2px]" aria-hidden="true">
                {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
                {Array.from({ length: dim }, (_, i) => {
                  const key = `${year}-${pad(m + 1)}-${pad(i + 1)}`;
                  return <span key={key} className="aspect-square rounded-[3px]" style={cellStyle(index.get(key), key, today)} />;
                })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
