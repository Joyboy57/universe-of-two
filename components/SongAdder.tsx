"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSong, resolveLink } from "@/app/(app)/playlist/actions";

type Result = { title: string; artist: string; cover: string | null; url: string; exact: boolean };

export function SongAdder() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [draft, setDraft] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    setBusy(true); setMsg(null); setResults([]); setDraft(null);
    try {
      if (/^https?:\/\//i.test(v)) {
        const r = await resolveLink(v);
        if (r.error || !r.url) setMsg(r.error ?? "That link didn't work.");
        else setDraft({ title: r.title ?? "", artist: r.artist ?? "", cover: r.cover ?? null, url: r.url, exact: true });
      } else {
        const res = await fetch(`/api/songs/search?q=${encodeURIComponent(v)}`);
        if (!res.ok) throw new Error("search");
        const j = (await res.json()) as { results: Result[] };
        setResults(j.results);
        if (!j.results.length) setMsg("No songs found. Try adding the artist's name, or paste a Spotify link.");
      }
    } catch {
      setMsg("Search didn't work. Check your connection, or paste a song link instead.");
    } finally {
      setBusy(false);
    }
  }

  async function add(r: Result) {
    setBusy(true); setMsg(null);
    const res = await addSong({ title: r.title, artist: r.artist, url: r.url, cover: r.cover, note });
    setBusy(false);
    if (res.error) return setMsg(res.error);
    setQ(""); setNote(""); setResults([]); setDraft(null);
    setMsg("Added ♥");
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <form onSubmit={search} className="space-y-3">
        <label htmlFor="song-q" className="label">Add a song</label>
        <div className="flex gap-2">
          <input id="song-q" value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Song name, or paste a Spotify link" />
          <button className="btn shrink-0" disabled={busy || !q.trim()}>{busy ? "…" : "Find"}</button>
        </div>
        <div>
          <label htmlFor="song-note" className="label">Why this song? (optional)</label>
          <input id="song-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className="input" placeholder="It reminds me of our first call" />
        </div>
      </form>

      {msg && <p role="status" className="text-sm text-[var(--ink-soft)]">{msg}</p>}

      {results.length > 0 && (
        <div className="space-y-2">
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={`${r.url}-${i}`} className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.cover ? <img src={r.cover} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]" aria-hidden="true">🎵</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="block truncate text-sm text-[var(--ink-soft)]">{r.artist}</span>
                </span>
                <button type="button" className="btn !min-h-10 !px-4" disabled={busy} onClick={() => add(r)}>Add</button>
              </li>
            ))}
          </ul>
          {results.some((r) => !r.exact) && (
            <p className="text-xs text-[var(--ink-soft)]">These open Spotify's search for the song. To open the exact song, paste its Spotify link instead.</p>
          )}
        </div>
      )}

      {draft && (
        <div className="space-y-3 rounded-2xl bg-[var(--bg)] p-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {draft.cover ? <img src={draft.cover} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--surface)]" aria-hidden="true">🎵</span>}
            <p className="text-sm text-[var(--ink-soft)]">Check the details, then add it.</p>
          </div>
          <div>
            <label htmlFor="d-title" className="label">Song title</label>
            <input id="d-title" value={draft.title} maxLength={150} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="input" />
          </div>
          <div>
            <label htmlFor="d-artist" className="label">Artist (optional)</label>
            <input id="d-artist" value={draft.artist} maxLength={150} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} className="input" />
          </div>
          <button type="button" className="btn" disabled={busy || !draft.title.trim()} onClick={() => add(draft)}>Add to our playlist</button>
        </div>
      )}
    </div>
  );
}
