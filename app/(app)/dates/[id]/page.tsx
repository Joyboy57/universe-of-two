import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORIES, fmtLong, iconFor, spanDays, type DateEntry } from "@/lib/dates";
import type { MediaItem } from "@/lib/media";
import { DeleteButton } from "@/components/DeleteButton";
import { MediaUploader } from "@/components/MediaUploader";
import { MediaGallery } from "@/components/MediaGallery";
import { deleteDate } from "../actions";

export default async function DateDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const { me, partner } = await getSpace();
  if (!me) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("dates")
    .select("id, date, end_date, title, category, icon, notes, location, rating, created_by, in_person")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const e = data as DateEntry;

  // Photos & videos: private bucket, so every file is shown through a short-lived signed link
  const { data: rows } = await supabase
    .from("media")
    .select("id, type, mime, size_bytes, width, height, storage_key, thumb_key, uploaded_by, created_at")
    .eq("date_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  const paths = (rows ?? []).flatMap((r) => [r.storage_key, r.thumb_key].filter((k): k is string => !!k));
  const urlFor = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrls(paths, 7200);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlFor.set(s.path, s.signedUrl);
  }
  const items: MediaItem[] = (rows ?? [])
    .filter((r) => urlFor.has(r.storage_key))
    .map((r) => ({
      id: r.id, type: r.type, mime: r.mime, size_bytes: r.size_bytes, width: r.width, height: r.height,
      uploaded_by: r.uploaded_by, created_at: r.created_at,
      url: urlFor.get(r.storage_key)!,
      thumbUrl: r.thumb_key ? urlFor.get(r.thumb_key) ?? null : null,
    }));

  const names: Record<string, string> = { [me.user_id]: "you" };
  if (partner) names[partner.user_id] = partner.display_name;

  const by = names[e.created_by] ?? "your person";
  const cat = CATEGORIES.find((c) => c.key === e.category);

  return (
    <main className="space-y-6">
      <Link href={`/calendar?saved=${e.date}`} className="text-sm text-[var(--ink-soft)] underline underline-offset-4">← Back to calendar</Link>

      <article className="card space-y-4 text-center">
        <div className="text-6xl" aria-hidden="true">{iconFor(e)}</div>
        <h1 className="font-display text-3xl font-semibold">{e.title}</h1>
        <p className="font-hand text-2xl text-[var(--ink-soft)]">
          {e.end_date && e.end_date !== e.date ? `${fmtLong(e.date)} to ${fmtLong(e.end_date)} (${spanDays(e)} days)` : fmtLong(e.date)}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {e.in_person && <span className="chip !min-h-8">♥ Together in person</span>}
          {cat && <span className="chip !min-h-8">{cat.icon} {cat.label}</span>}
          {e.location && <span className="chip !min-h-8">📍 {e.location}</span>}
          {e.rating ? <span className="chip !min-h-8 text-[var(--accent-deep)]" aria-label={`${e.rating} stars`}>{"★".repeat(e.rating)}</span> : null}
        </div>
        {e.notes && <p className="whitespace-pre-wrap text-left leading-relaxed">{e.notes}</p>}
        <p className="text-sm text-[var(--ink-soft)]">Added by {by}</p>
      </article>

      <section className="space-y-4" aria-labelledby="media-h">
        <h2 id="media-h" className="font-display text-2xl font-semibold">Photos &amp; videos</h2>
        {isNew && items.length === 0 && (
          <p className="font-hand text-2xl text-[var(--accent-deep)]">Saved ♥ Add your photos and videos from this day.</p>
        )}
        <MediaUploader dateId={e.id} coupleId={me.couple_id} />
        <MediaGallery items={items} names={names} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/dates/${e.id}/edit`} className="btn sm:flex-1">Edit</Link>
        <form action={deleteDate}>
          <input type="hidden" name="id" value={e.id} />
          <DeleteButton />
        </form>
      </div>
    </main>
  );
}
