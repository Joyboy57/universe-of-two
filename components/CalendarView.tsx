"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { HeartBurst } from "./HeartBurst";
import { YearView } from "./YearView";
import { AllTimeView } from "./AllTimeView";
import { MONTHS, WEEKDAYS, diffDays, fmtLong, iconFor, spanDays, toKey, type DateEntry } from "@/lib/dates";
import { indexDays, monthCounts } from "@/lib/calendar";

type Level = "month" | "year" | "all";
const LEVELS: Level[] = ["month", "year", "all"];
const LABEL: Record<Level, string> = { month: "Month", year: "Year", all: "All time" };

type Props = { entries: DateEntry[]; names: Record<string, string>; savedKey?: string; startDate: string | null };

export function CalendarView({ entries, names, savedKey, startDate }: Props) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [today, setToday] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [level, setLevel] = useState<Level>("month");
  const [dir, setDir] = useState(0); // >0 = zooming out
  const [selected, setSelected] = useState<string | null>(savedKey ?? null);
  const [burst, setBurst] = useState(savedKey ? 1 : 0);

  const index = useMemo(() => indexDays(entries), [entries]);
  const counts = useMemo(() => monthCounts(entries), [entries]);

  // "Today" is the viewer's own local date, so it is read after mount
  useEffect(() => {
    const now = new Date();
    const key = toKey(now.getFullYear(), now.getMonth(), now.getDate());
    setToday(key);
    if (savedKey) setCursor({ y: Number(savedKey.slice(0, 4)), m: Number(savedKey.slice(5, 7)) - 1 });
    else {
      setCursor({ y: now.getFullYear(), m: now.getMonth() });
      setSelected(key);
    }
  }, [savedKey]);

  const go = useCallback((next: Level) => {
    setDir(LEVELS.indexOf(next) - LEVELS.indexOf(level));
    setLevel(next);
  }, [level]);
  const zoomOut = useCallback(() => { if (level === "month") go("year"); else if (level === "year") go("all"); }, [level, go]);
  const zoomIn = useCallback(() => { if (level === "all") go("year"); else if (level === "year") go("month"); }, [level, go]);

  const fns = useRef({ zoomOut, zoomIn });
  useEffect(() => { fns.current = { zoomOut, zoomIn }; });

  // Pinch (touch) and Ctrl + scroll / trackpad pinch (desktop) zoom between levels
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let start = 0;
    let fired = false;
    let locked = false;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => { if (e.touches.length === 2) { start = dist(e.touches); fired = false; } };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || fired || !start) return;
      const ratio = dist(e.touches) / start;
      if (ratio < 0.72) { fired = true; fns.current.zoomOut(); }
      else if (ratio > 1.35) { fired = true; fns.current.zoomIn(); }
    };
    const onEnd = () => { start = 0; };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (locked || Math.abs(e.deltaY) < 4) return;
      locked = true;
      if (e.deltaY > 0) fns.current.zoomOut(); else fns.current.zoomIn();
      setTimeout(() => { locked = false; }, 450);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const variants: Variants = {
    enter: (d: number) => ({ opacity: 0, scale: reduce ? 1 : d > 0 ? 1.08 : 0.92 }),
    center: { opacity: 1, scale: 1 },
    exit: (d: number) => ({ opacity: 0, scale: reduce ? 1 : d > 0 ? 0.92 : 1.08 }),
  };

  const ready = cursor && today;
  const shiftMonth = (delta: number) => {
    if (!cursor) return;
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const select = (key: string) => {
    setSelected(key);
    if (index.has(key)) setBurst((b) => b + 1);
  };

  let monthView: React.ReactNode = null;
  if (ready) {
    const first = new Date(cursor.y, cursor.m, 1).getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array<null>(first).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    monthView = (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button type="button" className="btn btn-quiet !min-h-10 !px-4" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold">{MONTHS[cursor.m]} {cursor.y}</h2>
            <button
              type="button" className="text-sm text-[var(--ink-soft)] underline underline-offset-4"
              onClick={() => { setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }); setSelected(today); }}
            >
              Today
            </button>
          </div>
          <button type="button" className="btn btn-quiet !min-h-10 !px-4" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--ink-soft)]">
          {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} />;
            const key = toKey(cursor.y, cursor.m, day);
            const list = index.get(key) ?? [];
            const has = list.length > 0;
            const isToday = key === today;
            const isSel = key === selected;
            const planned = has && list.every((e) => e.date > today);
            const spanning = list.filter((e) => e.end_date && e.end_date !== e.date);
            const starts = spanning.some((e) => e.date === key);
            const ends = spanning.some((e) => e.end_date === key);
            return (
              <button
                key={key} type="button" onClick={() => select(key)}
                aria-label={`${fmtLong(key)}${has ? `, ${list.length} ${list.length === 1 ? "date" : "dates"}` : ""}`}
                aria-pressed={isSel}
                className={[
                  "relative flex min-h-[3.6rem] flex-col items-center justify-start rounded-2xl border p-1 text-sm transition-colors sm:min-h-[4.6rem]",
                  isSel ? "border-transparent bg-[color-mix(in_srgb,var(--accent)_38%,transparent)]" : "border-transparent hover:bg-[var(--bg)]",
                  has && !isSel ? "bg-[var(--bg)]" : "",
                  planned ? "!border-dashed !border-[var(--accent-deep)]" : "",
                  isToday ? "ring-2 ring-[var(--accent-deep)]" : "",
                ].join(" ")}
              >
                <span className={`text-xs ${isToday ? "font-bold" : "text-[var(--ink-soft)]"}`}>{day}</span>
                {has && (
                  <span className="mt-0.5 flex flex-wrap items-center justify-center text-base leading-none sm:text-lg">
                    {list.slice(0, 2).map((e) => <span key={e.id}>{iconFor(e)}</span>)}
                    {list.length > 2 && <span className="text-[0.65rem] text-[var(--ink-soft)]">+{list.length - 2}</span>}
                  </span>
                )}
                {spanning.length > 0 && (
                  <span
                    aria-hidden="true" className="absolute bottom-1 h-1.5"
                    style={{
                      left: starts ? "0.5rem" : "-0.25rem", right: ends ? "0.5rem" : "-0.25rem",
                      background: "var(--accent)", opacity: 0.85,
                      borderRadius: `${starts ? 9999 : 0}px ${ends ? 9999 : 0}px ${ends ? 9999 : 0}px ${starts ? 9999 : 0}px`,
                    }}
                  />
                )}
                {has && !planned && !spanning.length && <span className="beat absolute bottom-0.5 right-1.5 text-[0.7rem] text-[var(--accent-deep)]" aria-hidden="true">♥</span>}
                {isSel && has && burst > 0 && <HeartBurst key={burst} />}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-[var(--ink-soft)]">
          <span aria-hidden="true">♥</span> shared · dashed outline = still to come · a bar = a multi-day visit
        </p>
      </div>
    );
  }

  const dayEntries = selected ? index.get(selected) ?? [] : [];
  const isFuture = selected && today ? selected > today : false;

  return (
    <div ref={wrap} className="space-y-6" style={{ touchAction: "pan-y" }}>
      <section className="card !p-4 sm:!p-6" aria-label="Calendar">
        <div role="tablist" aria-label="Zoom level" className="mb-4 flex justify-center gap-2">
          {LEVELS.map((l) => (
            <button key={l} role="tab" type="button" aria-selected={level === l} aria-pressed={level === l} className="chip" onClick={() => go(l)}>
              {LABEL[l]}
            </button>
          ))}
        </div>

        {!ready ? (
          <div className="h-80 animate-pulse rounded-2xl bg-[var(--bg)]" aria-busy="true" aria-label="Loading calendar" />
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={level} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
            >
              {level === "month" && monthView}
              {level === "year" && (
                <YearView
                  year={cursor.y} index={index} counts={counts} today={today}
                  onShift={(d) => setCursor({ y: cursor.y + d, m: cursor.m })}
                  onPickMonth={(m) => { setCursor({ y: cursor.y, m }); go("month"); }}
                />
              )}
              {level === "all" && (
                <AllTimeView
                  entries={entries} counts={counts} today={today} startDate={startDate}
                  onPickYear={(y) => { setCursor({ y, m: cursor.m }); go("year"); }}
                  onPickMonth={(y, m) => { setCursor({ y, m }); go("month"); }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <p className="mt-3 text-center text-xs text-[var(--ink-soft)]">
          {level === "month" ? "Pinch in or use the tabs to zoom out." : "Tap a month or year to zoom in."}
        </p>
      </section>

      {level === "month" && selected && (
        <section className="space-y-3" aria-live="polite">
          <h3 className="font-display text-xl font-semibold">{fmtLong(selected)}</h3>

          {dayEntries.length === 0 ? (
            <p className="text-[var(--ink-soft)]">{isFuture ? "Nothing planned yet." : "Nothing saved for this day."}</p>
          ) : (
            <ul className="space-y-3">
              {dayEntries.map((e) => (
                <li key={e.id}>
                  <Link href={`/dates/${e.id}`} className="card flex items-center gap-4 !p-4 transition-transform hover:-translate-y-0.5">
                    <span className="text-3xl" aria-hidden="true">{iconFor(e)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block truncate text-sm text-[var(--ink-soft)]">
                        {[
                          e.end_date && e.end_date !== e.date ? `Day ${diffDays(e.date, selected) + 1} of ${spanDays(e)}` : null,
                          e.in_person ? "in person" : null,
                          e.location,
                          `added by ${names[e.created_by] ?? "someone"}`,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {e.rating ? <span className="text-sm text-[var(--accent-deep)]" aria-label={`${e.rating} stars`}>{"★".repeat(e.rating)}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link href={`/dates/new?date=${selected}`} className="btn w-full sm:w-auto">
            {isFuture ? "Plan something for this day" : "Add a date on this day"}
          </Link>
        </section>
      )}
    </div>
  );
}
