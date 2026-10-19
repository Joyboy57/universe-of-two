"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { saveDate } from "@/app/(app)/dates/actions";
import { CATEGORIES, ICON_CHOICES, categoryIcon, pad } from "@/lib/dates";
import type { PairState } from "@/lib/types";

type Initial = {
  id?: string; date?: string; title?: string; category?: string;
  icon?: string | null; notes?: string | null; location?: string | null; rating?: number | null;
  end_date?: string | null; in_person?: boolean;
};

export function DateForm({ initial, cancelHref }: { initial: Initial; cancelHref: string }) {
  const [state, action, pending] = useActionState<PairState, FormData>(saveDate, {});
  const [date, setDate] = useState(initial.date ?? "");
  const [category, setCategory] = useState(initial.category ?? "outing");
  const [icon, setIcon] = useState(initial.icon ?? ""); // "" = use the category's icon
  const [rating, setRating] = useState(initial.rating ?? 0);
  const [endDate, setEndDate] = useState(initial.end_date ?? "");

  useEffect(() => {
    if (!date) {
      const n = new Date();
      setDate(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`);
    }
  }, [date]);

  const shownIcon = icon || categoryIcon(category);

  return (
    <form action={action} className="card space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="rating" value={rating || ""} />

      <div>
        <label htmlFor="title" className="label">What did you do (or plan to do)?</label>
        <input id="title" name="title" required maxLength={120} defaultValue={initial.title ?? ""} className="input" placeholder="Movie night over video call" />
      </div>

      <div>
        <label htmlFor="date" className="label">Date</label>
        <input
          id="date" name="date" type="date" required value={date} className="input"
          onChange={(e) => { setDate(e.target.value); if (endDate && endDate < e.target.value) setEndDate(""); }}
        />
      </div>

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="in_person" defaultChecked={initial.in_person ?? false} className="h-5 w-5 accent-[var(--accent-deep)]" />
        <span>We'll be together in person</span>
      </label>

      <div>
        <label htmlFor="end_date" className="label">Ends on (optional, for multi-day visits)</label>
        <input id="end_date" name="end_date" type="date" min={date || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
      </div>

      <fieldset>
        <legend className="label">Category</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" className="chip" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>
              <span aria-hidden="true">{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Calendar icon</legend>
        <div className="flex flex-wrap gap-2">
          {ICON_CHOICES.map((ic) => (
            <button
              key={ic} type="button" className="chip !min-h-11 !px-3 !text-xl"
              aria-pressed={shownIcon === ic} aria-label={`Use ${ic}`} onClick={() => setIcon(ic)}
            >
              {ic}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="location" className="label">Where? (optional)</label>
        <input id="location" name="location" maxLength={200} defaultValue={initial.location ?? ""} className="input" />
      </div>

      <fieldset>
        <legend className="label">How was it? (optional)</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n} type="button" aria-label={`${n} ${n === 1 ? "star" : "stars"}`} aria-pressed={rating === n}
              onClick={() => setRating(rating === n ? 0 : n)}
              className={`min-h-11 min-w-11 rounded-full text-2xl ${n <= rating ? "text-[var(--accent-deep)]" : "text-[var(--line)]"}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="notes" className="label">Notes (optional)</label>
        <textarea
          id="notes" name="notes" rows={5} maxLength={4000} defaultValue={initial.notes ?? ""}
          className="input !min-h-32 py-3" placeholder="The little things you want to remember"
        />
      </div>

      {state.error && <p role="alert" className="error">{state.error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="btn sm:flex-1" disabled={pending}>{pending ? "Saving…" : initial.id ? "Save changes" : "Save to our universe"}</button>
        <Link href={cancelHref} className="btn btn-quiet">Cancel</Link>
      </div>
    </form>
  );
}
