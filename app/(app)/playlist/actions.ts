"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export type Resolved = { url?: string; title?: string; artist?: string; cover?: string | null; error?: string };

/** Reads a pasted music link: title and cover for Spotify and YouTube; any other link is saved as is. */
export async function resolveLink(raw: string): Promise<Resolved> {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return { error: "That doesn't look like a link." }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "Paste a link that starts with https://" };
  const host = u.hostname.replace(/^www\./, "");

  try {
    if (host === "open.spotify.com" || host === "spotify.link") {
      const clean = host === "open.spotify.com" ? `${u.origin}${u.pathname}` : u.toString(); // drops tracking parameters
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(clean)}`, { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        return { url: clean, title: j.title ?? "", cover: j.thumbnail_url ?? null };
      }
      return { url: clean };
    }
    if (host.endsWith("youtube.com") || host === "youtu.be") {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u.toString())}`, { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        return { url: u.toString(), title: j.title ?? "", artist: j.author_name ?? "", cover: j.thumbnail_url ?? null };
      }
    }
  } catch { /* fall through: keep the link, the person can type the title */ }
  return { url: u.toString() };
}

type NewSong = { title: string; artist?: string; url: string; cover?: string | null; note?: string };

export async function addSong(s: NewSong): Promise<{ error?: string }> {
  const title = s.title.trim();
  const artist = (s.artist ?? "").trim();
  const note = (s.note ?? "").trim();
  if (title.length < 1 || title.length > 150) return { error: "Give the song a title." };
  if (artist.length > 150 || note.length > 200) return { error: "That's a bit too long. Please shorten it." };
  try { if (!/^https?:$/.test(new URL(s.url).protocol)) throw new Error(); } catch { return { error: "That link isn't valid." }; }
  const cover = s.cover && s.cover.startsWith("https://") && s.cover.length <= 500 ? s.cover : null;

  const supabase = await supabaseServer();
  const { error } = await supabase.from("playlist_songs").insert({ title, artist: artist || null, url: s.url, cover_url: cover, note: note || null });
  if (error) return { error: "We couldn't add that song. Please try again." };
  revalidatePath("/playlist");
  revalidatePath("/");
  return {};
}

export async function updateSongLink(id: string, raw: string): Promise<{ error?: string }> {
  const r = await resolveLink(raw);
  if (r.error || !r.url) return { error: r.error ?? "That link isn't valid." };
  const update: Record<string, string> = { url: r.url };
  if (r.cover) update.cover_url = r.cover;
  const supabase = await supabaseServer();
  const { error } = await supabase.from("playlist_songs").update(update).eq("id", id);
  if (error) return { error: "We couldn't save that link." };
  revalidatePath("/playlist");
  return {};
}

export async function removeSong(id: string): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("playlist_songs").delete().eq("id", id);
  if (error) return { error: "We couldn't remove that song." };
  revalidatePath("/playlist");
  revalidatePath("/");
  return {};
}
