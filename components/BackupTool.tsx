"use client";
import { useEffect, useMemo, useState } from "react";
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from "fflate";
import { buildIndexHtml, slug, type Attached, type DateRow, type Manifest, type MediaRow } from "@/lib/backup";

type Add = (path: string, data: Uint8Array, compress?: boolean) => Promise<void>;
type Picker = { showSaveFilePicker?: (o: unknown) => Promise<{ createWritable: () => Promise<{ write: (c: Uint8Array) => Promise<void>; close: () => Promise<void> }> }> };

const mb = (n: number) => (n >= 1073741824 ? `${(n / 1073741824).toFixed(1)} GB` : `${Math.max(1, Math.round(n / 1048576))} MB`);

async function signAll(bucket: "media" | "daily", keys: string[]) {
  const urls = new Map<string, string>();
  for (let i = 0; i < keys.length; i += 50) {
    const res = await fetch("/api/export/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bucket, keys: keys.slice(i, i + 50) }) });
    if (!res.ok) continue;
    const j = (await res.json()) as { urls: Record<string, string> };
    for (const [k, v] of Object.entries(j.urls)) urls.set(k, v);
  }
  return urls;
}

/** Builds a ZIP in the browser. Where the browser allows, it streams straight to disk so big backups don't fill memory. */
async function makeZip(filename: string, build: (add: Add) => Promise<void>) {
  const picker = (window as unknown as Picker).showSaveFilePicker;
  let writable: Awaited<ReturnType<NonNullable<Picker["showSaveFilePicker"]>>> extends { createWritable: () => Promise<infer W> } ? W | null : never = null;
  if (picker) {
    const handle = await picker({ suggestedName: filename, types: [{ description: "ZIP file", accept: { "application/zip": [".zip"] } }] });
    writable = await handle.createWritable();
  }

  const chunks: Uint8Array[] = [];
  let chain: Promise<void> = Promise.resolve();
  let failure: Error | null = null;
  let finish!: () => void;
  const done = new Promise<void>((r) => { finish = r; });

  const zip = new Zip((err, chunk, final) => {
    if (err) { failure = err; finish(); return; }
    if (writable) { const w = writable; chain = chain.then(() => w.write(chunk)); } else chunks.push(chunk);
    if (final) chain = chain.then(async () => { if (writable) await writable.close(); }).then(finish);
  });

  const add: Add = async (path, data, compress = true) => {
    const f = compress ? new ZipDeflate(path, { level: 6 }) : new ZipPassThrough(path);
    zip.add(f);
    f.push(data, true);
    await chain;
  };

  await build(add);
  zip.end();
  await done;
  if (failure) throw failure;

  if (!writable) {
    const blob = new Blob(chunks as unknown as BlobPart[], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }
}

export function BackupTool() {
  const [m, setM] = useState<Manifest | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [canStream, setCanStream] = useState(false);

  useEffect(() => {
    setCanStream(!!(window as unknown as Picker).showSaveFilePicker);
    fetch("/api/export/manifest").then(async (r) => {
      if (!r.ok) throw new Error();
      setM((await r.json()) as Manifest);
    }).catch(() => setLoadErr("We couldn't load your data. Refresh and try again."));
  }, []);

  const years = useMemo(() => {
    if (!m) return [];
    const dateYear = new Map(m.dates.map((d) => [d.id, d.date.slice(0, 4)]));
    const out = new Map<string, { n: number; bytes: number }>();
    for (const f of m.media) {
      const y = dateYear.get(f.date_id);
      if (!y) continue;
      const cur = out.get(y) ?? { n: 0, bytes: 0 };
      out.set(y, { n: cur.n + 1, bytes: cur.bytes + f.size_bytes });
    }
    return [...out.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, v]) => ({ year, ...v }));
  }, [m]);

  const stamp = new Date().toISOString().slice(0, 10);
  const who = (id: string) => (m && id === m.me.id ? m.me.name : m?.partner?.name ?? "someone");

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label); setResult(null); setProgress(null);
    try { setResult(await fn()); }
    catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setResult("The backup didn't finish. Please try again."); }
    finally { setBusy(null); setProgress(null); }
  }

  // 1. everything written
  const dataPack = () => run("data", async () => {
    if (!m) return "";
    await makeZip(`universe-of-two-memories-${stamp}.zip`, async (add) => {
      await add("data.json", strToU8(JSON.stringify(m, null, 2)));
      await add("index.html", strToU8(buildIndexHtml({ title: "A Universe of Two", manifest: m, dates: m.dates, files: new Map(), sections: { dates: true, lists: true, answers: true, songs: true, daily: [] } })));
      await add("README.txt", strToU8("Open index.html in any browser. data.json holds everything in a plain, portable format.\nPhotos and videos are in the separate year packs."));
    });
    return "Saved. Unzip it and open index.html.";
  });

  // 2. photos & videos of one year
  const yearPack = (year: string) => run(year, async () => {
    if (!m) return "";
    const dates = m.dates.filter((d) => d.date.startsWith(year));
    const ids = new Set(dates.map((d) => d.id));
    const rows = m.media.filter((f) => ids.has(f.date_id));
    const failed: string[] = [];
    await makeZip(`universe-of-two-${year}-${stamp}.zip`, async (add) => {
      const urls = await signAll("media", rows.map((r) => r.storage_key));
      const files = new Map<string, Attached[]>();
      const byDate = new Map<string, MediaRow[]>();
      for (const r of rows) byDate.set(r.date_id, [...(byDate.get(r.date_id) ?? []), r]);

      let n = 0;
      for (const d of dates as DateRow[]) {
        const list = byDate.get(d.id) ?? [];
        for (let i = 0; i < list.length; i++) {
          const r = list[i];
          n++;
          setProgress(`Downloading ${n} of ${rows.length}…`);
          const base = r.storage_key.split("/").pop() ?? "file";
          const path = `media/${d.date}-${slug(d.title)}/${String(i + 1).padStart(2, "0")}-${base}`;
          try {
            const res = await fetch(urls.get(r.storage_key) ?? "");
            if (!res.ok) throw new Error();
            await add(path, new Uint8Array(await res.arrayBuffer()), false);
            files.set(d.id, [...(files.get(d.id) ?? []), { path, type: r.type === "video" ? "video" : "image" }]);
          } catch { failed.push(path); }
        }
      }
      const part: Manifest = { ...m, dates, media: rows, lists: [], items: [], answers: [], photos: [], songs: [] };
      await add("data.json", strToU8(JSON.stringify(part, null, 2)));
      await add("index.html", strToU8(buildIndexHtml({ title: `A Universe of Two · ${year}`, manifest: part, dates, files, sections: { dates: true, lists: false, answers: false, songs: false, daily: [] } })));
      if (failed.length) await add("MISSING.txt", strToU8("These files could not be downloaded:\n" + failed.join("\n")));
    });
    return failed.length ? `Saved, but ${failed.length} file(s) couldn't be downloaded (listed in MISSING.txt).` : "Saved. Unzip it and open index.html.";
  });

  // 3. daily photo swaps + answers
  const dailyPack = () => run("daily", async () => {
    if (!m) return "";
    const failed: string[] = [];
    await makeZip(`universe-of-two-daily-${stamp}.zip`, async (add) => {
      const urls = await signAll("daily", m.photos.map((p) => p.storage_key));
      const shown: { path: string; day: string; who: string; caption: string | null }[] = [];
      let n = 0;
      for (const p of m.photos) {
        n++;
        setProgress(`Downloading ${n} of ${m.photos.length}…`);
        const path = `daily/${p.day}-${slug(who(p.user_id))}.jpg`;
        try {
          const res = await fetch(urls.get(p.storage_key) ?? "");
          if (!res.ok) throw new Error();
          await add(path, new Uint8Array(await res.arrayBuffer()), false);
          shown.push({ path, day: p.day, who: who(p.user_id), caption: p.caption });
        } catch { failed.push(path); }
      }
      const part: Manifest = { ...m, dates: [], media: [], lists: [], items: [], songs: [] };
      await add("data.json", strToU8(JSON.stringify(part, null, 2)));
      await add("index.html", strToU8(buildIndexHtml({ title: "A Universe of Two · daily questions and photos", manifest: part, dates: [], files: new Map(), sections: { dates: false, lists: false, answers: true, songs: false, daily: shown } })));
      if (failed.length) await add("MISSING.txt", strToU8("These files could not be downloaded:\n" + failed.join("\n")));
    });
    return failed.length ? `Saved, but ${failed.length} photo(s) couldn't be downloaded.` : "Saved. Unzip it and open index.html.";
  });

  if (loadErr) return <p role="alert" className="error">{loadErr}</p>;
  if (!m) return <div className="card h-40 animate-pulse" aria-busy="true" aria-label="Loading" />;

  const Pack = ({ id, title, text, warn, onClick }: { id: string; title: string; text: string; warn?: string; onClick: () => void }) => (
    <li className="card space-y-2 !p-4">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-[var(--ink-soft)]">{text}</p>
      {warn && <p className="text-sm text-[var(--accent-deep)]">{warn}</p>}
      <button className="btn" disabled={!!busy} onClick={onClick}>{busy === id ? "Working…" : "Download .zip"}</button>
    </li>
  );

  return (
    <div className="space-y-6">
      <p className="text-[var(--ink-soft)]">
        Download your memories as ZIP files you keep yourself. Each one opens offline: unzip it and open <b>index.html</b>.
        {canStream ? " Your browser can save big files straight to disk." : " On this device the file is built in memory, so for large photo packs use a computer."}
      </p>

      <ul className="space-y-3">
        <Pack id="data" title="Everything written" text={`${m.dates.length} dates, ${m.lists.length} lists, ${m.answers.length} daily answers, ${m.songs.length} songs. No photos or videos. Small and quick.`} onClick={dataPack} />
        {years.map((y) => (
          <Pack
            key={y.year} id={y.year} title={`Photos & videos · ${y.year}`}
            text={`${y.n} ${y.n === 1 ? "file" : "files"}, about ${mb(y.bytes)}, with the dates they belong to.`}
            warn={!canStream && y.bytes > 300 * 1048576 ? "This is big for a phone. A computer will do it more reliably." : undefined}
            onClick={() => yearPack(y.year)}
          />
        ))}
        {m.photos.length > 0 && <Pack id="daily" title="Daily photo swaps" text={`${m.photos.length} photos, plus all your daily questions and answers.`} onClick={dailyPack} />}
      </ul>

      <div aria-live="polite" className="space-y-1">
        {progress && <p className="text-sm text-[var(--ink-soft)]">{progress}</p>}
        {result && <p role="status" className="text-[var(--accent-deep)]">{result}</p>}
      </div>
      <p className="text-xs text-[var(--ink-soft)]">Your partner's daily answers and photos are included only for days you shared yours too. Keep backup files somewhere private: they contain everything.</p>
    </div>
  );
}
