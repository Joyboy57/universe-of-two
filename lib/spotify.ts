export type SongResult = { title: string; artist: string; cover: string | null; url: string; exact: boolean };

let cached: { value: string; exp: number } | null = null;

async function spotifyToken(id: string, secret: string) {
  if (cached && cached.exp > Date.now() + 30_000) return cached.value;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("token");
  const j = await res.json();
  cached = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.value;
}

async function viaSpotify(q: string): Promise<SongResult[]> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return [];
  const token = await spotifyToken(id, secret);
  const res = await fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: "track", limit: "8" })}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!res.ok) throw new Error("search");
  const j = await res.json();
  return (j.tracks?.items ?? []).map((t: { name: string; artists: { name: string }[]; album?: { images?: { url: string }[] }; external_urls?: { spotify?: string } }) => ({
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    cover: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null,
    url: t.external_urls?.spotify ?? `https://open.spotify.com/search/${encodeURIComponent(`${t.name} ${t.artists[0]?.name ?? ""}`)}`,
    exact: !!t.external_urls?.spotify,
  }));
}

// Free, no account needed. Gives title, artist and cover; we point the link at Spotify's search.
async function viaItunes(q: string): Promise<SongResult[]> {
  const res = await fetch(`https://itunes.apple.com/search?${new URLSearchParams({ term: q, entity: "song", limit: "8" })}`, { cache: "no-store" });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.results ?? []).map((r: { trackName: string; artistName: string; artworkUrl100?: string }) => ({
    title: r.trackName,
    artist: r.artistName,
    cover: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "300x300") : null,
    url: `https://open.spotify.com/search/${encodeURIComponent(`${r.trackName} ${r.artistName}`)}`,
    exact: false,
  }));
}

export async function searchSongs(q: string): Promise<SongResult[]> {
  try {
    const exact = await viaSpotify(q);
    if (exact.length) return exact;
  } catch { /* fall back to the free catalog */ }
  try { return await viaItunes(q); } catch { return []; }
}
