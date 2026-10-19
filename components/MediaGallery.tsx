"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia } from "@/app/(app)/dates/actions";
import type { MediaItem } from "@/lib/media";

export function MediaGallery({ items, names }: { items: MediaItem[]; names: Record<string, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const count = items.length;
  const isOpen = open !== null;
  const go = useCallback(
    (d: number) => setOpen((i) => (i === null || count === 0 ? i : (i + d + count) % count)),
    [count]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, go]);

  if (count === 0) return <p className="text-[var(--ink-soft)]">No photos or videos yet.</p>;

  const item = open !== null ? items[open] : null;

  async function remove() {
    if (!item || !confirm("Delete this for both of you? This can't be undone.")) return;
    setDeleting(true);
    setErr(null);
    const r = await deleteMedia(item.id);
    setDeleting(false);
    if (r.error) return setErr(r.error);
    setOpen(null);
    router.refresh();
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((m, i) => (
          <li key={m.id}>
            <button
              type="button" onClick={() => { setErr(null); setOpen(i); }}
              aria-label={`Open ${m.type} ${i + 1} of ${count}`}
              className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-[var(--surface)]"
            >
              {m.thumbUrl || m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl" aria-hidden="true">🎞️</span>
              )}
              {m.type === "video" && (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white" aria-hidden="true">▶ video</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {item && (
        <div
          role="dialog" aria-modal="true" aria-label="Photo and video viewer"
          className="fixed inset-0 z-50 flex flex-col bg-black/92 text-white"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}>
            <button ref={closeBtn} type="button" onClick={() => setOpen(null)} className="min-h-11 rounded-full bg-white/15 px-4 font-semibold">Close</button>
            <span className="text-sm text-white/80" aria-live="polite">{(open ?? 0) + 1} / {count}</span>
            <button type="button" onClick={remove} disabled={deleting} className="min-h-11 rounded-full bg-white/15 px-4 font-semibold">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            {item.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <video key={item.id} src={item.url} poster={item.thumbUrl ?? undefined} controls playsInline preload="metadata" className="max-h-full max-w-full" />
            )}
            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 min-h-12 min-w-12 -translate-y-1/2 rounded-full bg-white/15 text-2xl">‹</button>
                <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 min-h-12 min-w-12 -translate-y-1/2 rounded-full bg-white/15 text-2xl">›</button>
              </>
            )}
          </div>

          <p className="px-4 py-3 text-center text-sm text-white/80" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}>
            {err ? <span role="alert" className="text-[#ff9db6]">{err}</span> : <>Added by {names[item.uploaded_by] ?? "someone"}</>}
          </p>
        </div>
      )}
    </>
  );
}
