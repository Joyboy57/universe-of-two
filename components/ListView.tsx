"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addItem, itemToDate, removeItem, toggleItem } from "@/app/(app)/lists/actions";
import type { ListItem } from "@/lib/lists";

export function ListView({ listId, placeholder, initial }: { listId: string; placeholder: string; initial: ListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ListItem[]>(initial);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setItems(initial), [initial]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setAdding(true);
    setError(null);
    const r = await addItem(listId, t);
    setAdding(false);
    if (r.error || !r.item) return setError(r.error ?? "We couldn't add that.");
    setItems((p) => [r.item!, ...p]);
    setText("");
  }

  async function toggle(it: ListItem) {
    const next = !it.done;
    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: next } : x)));
    const r = await toggleItem(it.id, next);
    if (r.error) {
      setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !next } : x)));
      setError(r.error);
    }
  }

  async function remove(it: ListItem) {
    setItems((p) => p.filter((x) => x.id !== it.id));
    const r = await removeItem(it.id);
    if (r.error) { setError(r.error); router.refresh(); }
  }

  async function toDate(it: ListItem) {
    setError(null);
    const r = await itemToDate(it.id);
    if (r.dateId) router.push(`/dates/${r.dateId}`);
    else setError(r.error ?? "We couldn't add it to the calendar.");
  }

  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const Row = ({ it }: { it: ListItem }) => (
    <li className="card flex items-center gap-3 !p-3">
      <button
        type="button" onClick={() => toggle(it)} role="checkbox" aria-checked={it.done}
        aria-label={it.done ? `Mark "${it.text}" as not done` : `Mark "${it.text}" as done`}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg ${it.done ? "border-transparent bg-[var(--accent)] text-[#3d2b3a]" : "border-[var(--line)]"}`}
      >
        {it.done ? "✓" : ""}
      </button>
      <span className="min-w-0 flex-1">
        <span className={`block ${it.done ? "text-[var(--ink-soft)] line-through" : ""}`}>{it.text}</span>
        {it.done && (it.date_id
          ? <Link href={`/dates/${it.date_id}`} className="text-sm text-[var(--accent-deep)] underline underline-offset-4">On our calendar ♥</Link>
          : <button type="button" onClick={() => toDate(it)} className="text-sm text-[var(--accent-deep)] underline underline-offset-4">Add to our calendar</button>)}
      </span>
      <button type="button" onClick={() => remove(it)} aria-label={`Remove "${it.text}"`} className="min-h-11 min-w-11 rounded-full text-xl text-[var(--ink-soft)]">×</button>
    </li>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-item" className="sr-only">Add an item</label>
        <input id="new-item" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder={placeholder} className="input" />
        <button className="btn shrink-0" disabled={adding || !text.trim()}>{adding ? "…" : "Add"}</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}

      {open.length === 0 && done.length === 0 && <p className="text-[var(--ink-soft)]">Nothing here yet. Add the first thing you want to do together.</p>}
      {open.length > 0 && <ul className="space-y-2">{open.map((it) => <Row key={it.id} it={it} />)}</ul>}
      {done.length > 0 && (
        <section className="space-y-2" aria-label="Done">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Done together ({done.length})</h2>
          <ul className="space-y-2">{done.map((it) => <Row key={it.id} it={it} />)}</ul>
        </section>
      )}
    </div>
  );
}
