"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MAX_FILE_BYTES, extFor, prepareImage, prepareVideo, videoMime } from "@/lib/media";

type Row = { id: string; name: string; status: "queued" | "preparing" | "uploading" | "done" | "error"; message?: string };

const friendly = (msg: string) => {
  if (/exceed|too large|size/i.test(msg)) return "That file is too large for storage.";
  if (/mime|type/i.test(msg)) return "That file type isn't allowed.";
  return "Upload failed. Check your connection and try again.";
};

export function MediaUploader({ dateId, coupleId }: { dateId: string; coupleId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = (id: string, p: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));

  async function uploadOne(supabase: SupabaseClient, file: File, id: string) {
    const isHeic = /\.(heic|heif)$/i.test(file.name);
    const isImage = file.type.startsWith("image/") || isHeic;
    const vmime = isImage ? null : videoMime(file);
    if (!isImage && !vmime) throw new Error("Only photos and videos are supported.");

    patch(id, { status: "preparing" });
    let main: Blob;
    let mime: string;
    let width: number | null;
    let height: number | null;
    let thumb: Blob | null;
    let type: "image" | "video";

    if (isImage) {
      const p = await prepareImage(file);
      ({ main, mime, width, height, thumb } = p);
      type = "image";
    } else {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("Over 50 MB. Trim it to about 30 to 40 seconds and try again.");
      }
      const info = await prepareVideo(file);
      main = file;
      mime = vmime!;
      ({ width, height, thumb } = info);
      type = "video";
    }
    if (main.size > MAX_FILE_BYTES) throw new Error("That file is over 50 MB.");

    patch(id, { status: "uploading" });
    const base = `${coupleId}/${dateId}/${crypto.randomUUID()}`;
    const key = `${base}.${extFor(mime)}`;
    const up = await supabase.storage.from("media").upload(key, main, { contentType: mime, cacheControl: "3600" });
    if (up.error) throw new Error(friendly(up.error.message));

    let thumbKey: string | null = null;
    if (thumb) {
      const tk = `${base}_t.jpg`;
      const t = await supabase.storage.from("media").upload(tk, thumb, { contentType: "image/jpeg", cacheControl: "3600" });
      if (!t.error) thumbKey = tk;
    }

    const { error } = await supabase.from("media").insert({
      date_id: dateId, storage_key: key, thumb_key: thumbKey, type, mime,
      size_bytes: main.size + (thumbKey && thumb ? thumb.size : 0), width, height,
    });
    if (error) {
      await supabase.storage.from("media").remove([key, ...(thumbKey ? [thumbKey] : [])]);
      throw new Error("Couldn't save that file. Please try again.");
    }
    patch(id, { status: "done" });
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const list: Row[] = files.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, status: "queued" }));
    setRows(list);
    setBusy(true);
    const supabase = supabaseBrowser();
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadOne(supabase, files[i], list[i].id);
      } catch (err) {
        patch(list[i].id, { status: "error", message: err instanceof Error ? err.message : "Upload failed." });
      }
    }
    setBusy(false);
    router.refresh();
  }

  const label = (r: Row) =>
    ({ queued: "Waiting…", preparing: "Preparing…", uploading: "Uploading…", done: "Added ♥", error: r.message ?? "Failed" })[r.status];

  return (
    <div className="space-y-3">
      <input ref={input} type="file" multiple accept="image/*,video/*" className="hidden" onChange={onPick} />
      <button type="button" className="btn w-full sm:w-auto" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading…" : "Add photos & videos"}
      </button>
      <p className="text-sm text-[var(--ink-soft)]">Photos are shrunk automatically. Videos can be up to 50 MB each.</p>

      {rows.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm">
              <span className="truncate">{r.name}</span>
              <span className={r.status === "error" ? "error shrink-0 text-right" : "shrink-0 text-[var(--ink-soft)]"}>{label(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
