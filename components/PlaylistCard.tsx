"use client";
import { useActionState } from "react";
import { savePlaylist } from "@/app/(app)/today/actions";
import { providerOf } from "@/lib/playlist";
import type { FormState } from "@/lib/types";

export function PlaylistCard({ url, title }: { url: string | null; title: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePlaylist, {});

  const form = (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="pl-url" className="label">Playlist link</label>
        <input id="pl-url" name="url" type="url" inputMode="url" defaultValue={url ?? ""} placeholder="https://open.spotify.com/playlist/…" className="input" />
      </div>
      <div>
        <label htmlFor="pl-title" className="label">Name (optional)</label>
        <input id="pl-title" name="title" maxLength={80} defaultValue={title ?? ""} placeholder="Songs that sound like us" className="input" />
      </div>
      <p className="text-sm text-[var(--ink-soft)]">Works with Spotify, YouTube Music, Apple Music, JioSaavn and others. Leave the link empty to remove it.</p>
      {state.error && <p role="alert" className="error">{state.error}</p>}
      {state.ok && <p role="status" className="text-[var(--accent-deep)]">Saved ♥</p>}
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );

  if (!url) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--ink-soft)]">Pin the playlist you share, so it's one tap away for both of you.</p>
        {form}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-display text-xl font-semibold">{title || "Our playlist"}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn">Open in {providerOf(url)}</a>
      <details>
        <summary className="cursor-pointer text-sm text-[var(--ink-soft)] underline underline-offset-4">Change playlist</summary>
        <div className="mt-3">{form}</div>
      </details>
    </div>
  );
}
