"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeSong, updateSongLink } from "@/app/(app)/playlist/actions";
import { providerOf } from "@/lib/playlist";

export type Song = { id: string; title: string; artist: string | null; url: string; cover_url: string | null; note: string | null; added_by: string };

function SongRow({ song, by }: { song: Song; by: string }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isSearch = song.url.includes("open.spotify.com/search/");

  async function saveLink() {
    setBusy(true); setMsg(null);
    const r = await updateSongLink(song.id, link);
    setBusy(false);
    if (r.error) return setMsg(r.error);
    setLink(""); router.refresh();
  }
  async function remove() {
    if (!confirm(`Remove "${song.title}" from your playlist?`)) return;
    setBusy(true);
    const r = await removeSong(song.id);
    setBusy(false);
    if (r.error) return setMsg(r.error);
    router.refresh();
  }

  return (
    <li className="card !p-3">
      <div className="flex items-center gap-3">
        <a href={song.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Open ${song.title} in ${providerOf(song.url)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {song.cover_url ? <img src={song.cover_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--bg)] text-2xl" aria-hidden="true">🎵</span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{song.title}</span>
            <span className="block truncate text-sm text-[var(--ink-soft)]">{[song.artist, `added by ${by}`].filter(Boolean).join(" · ")}</span>
            <span className="block truncate text-xs text-[var(--accent-deep)]">{isSearch ? "Opens Spotify search ›" : `Open in ${providerOf(song.url)} ›`}</span>
          </span>
        </a>
      </div>
      {song.note && <p className="mt-2 rounded-xl bg-[var(--bg)] px-3 py-2 text-sm">“{song.note}”</p>}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-[var(--ink-soft)] underline underline-offset-4">{isSearch ? "Set the exact Spotify link" : "Change link or remove"}</summary>
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <label htmlFor={`l-${song.id}`} className="sr-only">Spotify link</label>
            <input id={`l-${song.id}`} value={link} onChange={(e) => setLink(e.target.value)} className="input" placeholder="Paste the song's Spotify link" />
            <button type="button" className="btn shrink-0 !min-h-12" disabled={busy || !link.trim()} onClick={saveLink}>Save</button>
          </div>
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={remove}>Remove song</button>
          {msg && <p role="alert" className="error">{msg}</p>}
        </div>
      </details>
    </li>
  );
}

export function SongList({ songs, names }: { songs: Song[]; names: Record<string, string> }) {
  if (songs.length === 0) return <p className="text-[var(--ink-soft)]">No songs yet. Add the first one that makes you think of each other.</p>;
  return <ul className="space-y-3">{songs.map((s) => <SongRow key={s.id} song={s} by={names[s.added_by] ?? "someone"} />)}</ul>;
}
