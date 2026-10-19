"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { prepareJpegPair } from "@/lib/media";
import { photoPosted, removePhoto } from "@/app/(app)/today/actions";

type Props = { day: string; coupleId: string; userId: string; replace: boolean; partnerName: string; partnerPosted: boolean };

export function PhotoSwap({ day, coupleId, userId, replace, partnerName, partnerPosted }: Props) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    let uploaded: string[] = [];
    try {
      if (replace) {
        const r = await removePhoto(day);
        if (r.error) throw new Error(r.error);
      }
      const { main, thumb } = await prepareJpegPair(file);
      const base = `${coupleId}/${day}/${userId}_${crypto.randomUUID()}`;
      const key = `${base}.jpg`;
      const thumbKey = `${base}_t.jpg`;

      const up = await supabase.storage.from("daily").upload(key, main, { contentType: "image/jpeg", cacheControl: "3600" });
      if (up.error) throw new Error("Upload failed. Check your connection and try again.");
      uploaded = [key];
      const t = await supabase.storage.from("daily").upload(thumbKey, thumb, { contentType: "image/jpeg", cacheControl: "3600" });
      const hasThumb = !t.error;
      if (hasThumb) uploaded.push(thumbKey);

      const { error } = await supabase.from("daily_photos").insert({
        day, storage_key: key, thumb_key: hasThumb ? thumbKey : null, caption: caption.trim() || null,
      });
      if (error) throw new Error("Couldn't save your photo. Please try again.");

      const r = await photoPosted(day);
      if (r.error) throw new Error(r.error);
      setCaption("");
      router.refresh();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from("daily").remove(uploaded);
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={library} type="file" accept="image/*" className="hidden" onChange={onPick} />

      {!replace && (
        <p className="text-sm text-[var(--ink-soft)]">
          {partnerPosted ? `${partnerName} has already shared theirs ♥ You'll see it as soon as you share yours.` : `${partnerName} won't see yours until they've shared theirs too.`}
        </p>
      )}

      <div>
        <label htmlFor="caption" className="label">Caption (optional)</label>
        <input id="caption" maxLength={120} value={caption} onChange={(e) => setCaption(e.target.value)} className="input" placeholder="What's this?" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn" disabled={busy} onClick={() => camera.current?.click()}>{busy ? "Sharing…" : replace ? "Retake" : "Take a photo"}</button>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => library.current?.click()}>{replace ? "Pick another" : "Choose from library"}</button>
      </div>
      {msg && <p role="alert" className="error">{msg}</p>}
    </div>
  );
}
