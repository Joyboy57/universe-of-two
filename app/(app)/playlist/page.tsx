import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { SongAdder } from "@/components/SongAdder";
import { SongList, type Song } from "@/components/SongList";
import { PlaylistCard } from "@/components/PlaylistCard";

export default async function PlaylistPage() {
  const { me, partner, couple } = await getSpace();
  if (!me || !couple) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("playlist_songs").select("id, title, artist, url, cover_url, note, added_by")
    .order("created_at", { ascending: false }).limit(500);

  const names: Record<string, string> = { [me.user_id]: "you" };
  if (partner) names[partner.user_id] = partner.display_name;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Our playlist <span aria-hidden="true">🎧</span></h1>
        <p className="text-[var(--ink-soft)]">Songs you pick for each other. Tap one to open it in Spotify.</p>
      </div>

      <SongAdder />

      <section className="space-y-3" aria-labelledby="songs-h">
        <h2 id="songs-h" className="font-display text-xl font-semibold">Songs ({(data ?? []).length})</h2>
        <SongList songs={(data ?? []) as Song[]} names={names} />
      </section>

      <section className="card space-y-3" aria-labelledby="pin-h">
        <h2 id="pin-h" className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Our Spotify playlist</h2>
        <PlaylistCard url={couple.playlist_url ?? null} title={couple.playlist_title ?? null} />
        <p className="text-xs text-[var(--ink-soft)]">Pin a playlist you keep in Spotify. Songs you add here live in this app, and apps like Spotify can't import them automatically.</p>
      </section>
    </main>
  );
}
