export type DateRow = { id: string; date: string; end_date: string | null; title: string; category: string; icon: string | null; notes: string | null; location: string | null; rating: number | null; in_person: boolean; created_by: string };
export type MediaRow = { id: string; date_id: string; storage_key: string; thumb_key: string | null; type: string; mime: string | null; size_bytes: number; created_at: string; uploaded_by: string };
export type Manifest = {
  generatedAt: string;
  me: { id: string; name: string };
  partner: { id: string; name: string } | null;
  couple: { name: string; start_date: string | null; playlist_url: string | null; playlist_title: string | null };
  dates: DateRow[];
  media: MediaRow[];
  lists: { id: string; title: string; kind: string }[];
  items: { id: string; list_id: string; text: string; note: string | null; done: boolean; date_id: string | null }[];
  answers: { day: string; user_id: string; body: string; question: string }[];
  photos: { day: string; user_id: string; storage_key: string; thumb_key: string | null; caption: string | null }[];
  songs: { title: string; artist: string | null; url: string; note: string | null; added_by: string; created_at: string }[];
};

export const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? esc(u) : "#");

export type Attached = { path: string; type: "image" | "video" };

export function buildIndexHtml(opts: {
  title: string;
  manifest: Manifest;
  dates: DateRow[];
  files: Map<string, Attached[]>; // date id -> files inside the zip
  sections: { dates: boolean; lists: boolean; answers: boolean; songs: boolean; daily: { path: string; day: string; who: string; caption: string | null }[] };
}) {
  const { manifest: m, dates, files, sections } = opts;
  const who = (id: string) => (id === m.me.id ? m.me.name : m.partner?.name ?? "Someone");
  const stars = (n: number | null) => (n ? "★".repeat(n) : "");

  const dateHtml = dates.map((d) => {
    const range = d.end_date && d.end_date !== d.date ? `${d.date} to ${d.end_date}` : d.date;
    const media = (files.get(d.id) ?? []).map((f) =>
      f.type === "video"
        ? `<video controls preload="metadata" src="${esc(f.path)}"></video>`
        : `<a href="${esc(f.path)}"><img loading="lazy" src="${esc(f.path)}" alt=""></a>`
    ).join("");
    return `<article>
<h3>${esc(d.icon ?? "")} ${esc(d.title)}</h3>
<p class="meta">${esc(range)} · ${esc(d.category)}${d.in_person ? " · together in person" : ""}${d.location ? " · " + esc(d.location) : ""} ${stars(d.rating)}</p>
${d.notes ? `<p class="notes">${esc(d.notes)}</p>` : ""}
${media ? `<div class="grid">${media}</div>` : ""}
</article>`;
  }).join("\n");

  const listHtml = m.lists.map((l) => {
    const rows = m.items.filter((i) => i.list_id === l.id).map((i) => `<li>${i.done ? "☑" : "☐"} ${esc(i.text)}</li>`).join("");
    return `<article><h3>${esc(l.title)}</h3><ul class="plain">${rows || "<li>(empty)</li>"}</ul></article>`;
  }).join("\n");

  const days = [...new Set(m.answers.map((a) => a.day))].sort();
  const answerHtml = days.map((day) => {
    const list = m.answers.filter((a) => a.day === day);
    return `<article><h3>${esc(day)}</h3><p class="notes"><b>${esc(list[0].question)}</b></p>${list.map((a) => `<p><b>${esc(who(a.user_id))}:</b> ${esc(a.body)}</p>`).join("")}</article>`;
  }).join("\n");

  const dailyHtml = sections.daily.length
    ? `<div class="grid">${sections.daily.map((p) => `<figure><a href="${esc(p.path)}"><img loading="lazy" src="${esc(p.path)}" alt=""></a><figcaption>${esc(p.day)} · ${esc(p.who)}${p.caption ? " · " + esc(p.caption) : ""}</figcaption></figure>`).join("")}</div>`
    : "";

  const songHtml = m.songs.map((s) => `<li><a href="${safeUrl(s.url)}">${esc(s.title)}</a>${s.artist ? " · " + esc(s.artist) : ""}${s.note ? ` <i>“${esc(s.note)}”</i>` : ""}</li>`).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title>
<style>
body{font:16px/1.6 system-ui,sans-serif;background:#fff8f3;color:#3d2b3a;margin:0;padding:1rem}
main{max-width:46rem;margin:auto} h1,h2,h3{font-family:Georgia,serif;margin:.2rem 0}
article{background:#fbeff1;border:1px solid #f1d3da;border-radius:1.25rem;padding:1rem;margin:1rem 0}
.meta{color:#7a5f74;margin:.1rem 0} .notes{white-space:pre-wrap}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.5rem;margin-top:.5rem}
.grid img,.grid video{width:100%;height:10rem;object-fit:cover;border-radius:.75rem;background:#f1d3da}
figure{margin:0} figcaption{font-size:.8rem;color:#7a5f74} ul.plain{list-style:none;padding:0}
a{color:#b07a9a}
</style></head><body><main>
<h1>${esc(opts.title)}</h1>
<p class="meta">${esc(m.me.name)}${m.partner ? " &amp; " + esc(m.partner.name) : ""} · saved ${esc(m.generatedAt.slice(0, 10))}${m.couple.start_date ? " · together since " + esc(m.couple.start_date) : ""}</p>
${sections.dates && dates.length ? `<h2>Our dates</h2>\n${dateHtml}` : ""}
${sections.lists && m.lists.length ? `<h2>Our lists</h2>\n${listHtml}` : ""}
${sections.answers && answerHtml ? `<h2>Daily questions</h2>\n${answerHtml}` : ""}
${dailyHtml ? `<h2>Daily photos</h2>\n${dailyHtml}` : ""}
${sections.songs && songHtml ? `<h2>Our playlist</h2><ul class="plain">${songHtml}</ul>` : ""}
</main></body></html>`;
}
