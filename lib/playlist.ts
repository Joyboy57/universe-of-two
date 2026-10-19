export function providerOf(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("spotify")) return "Spotify";
    if (host.includes("music.youtube")) return "YouTube Music";
    if (host.includes("youtube") || host === "youtu.be") return "YouTube";
    if (host.includes("music.apple")) return "Apple Music";
    if (host.includes("jiosaavn")) return "JioSaavn";
    if (host.includes("gaana")) return "Gaana";
    if (host.includes("soundcloud")) return "SoundCloud";
    if (host.includes("deezer")) return "Deezer";
    return host;
  } catch {
    return "your music app";
  }
}
