import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSpace } from "@/lib/session";
import { questionFor } from "@/lib/ritual";

export const dynamic = "force-dynamic";

// Everything YOU are allowed to see, as one JSON document. Row Level Security does the filtering,
// so (for example) your partner's daily answers only appear for days you answered too.
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { me, partner, couple } = await getSpace();
  if (!me || !couple) return NextResponse.json({ error: "not paired" }, { status: 404 });

  const L = 20000;
  const [dates, media, lists, items, answers, photos, songs] = await Promise.all([
    supabase.from("dates").select("id, date, end_date, title, category, icon, notes, location, rating, in_person, created_by").order("date").limit(L),
    supabase.from("media").select("id, date_id, storage_key, thumb_key, type, mime, size_bytes, created_at, uploaded_by").order("created_at").limit(L),
    supabase.from("lists").select("id, title, kind").order("created_at").limit(L),
    supabase.from("list_items").select("id, list_id, text, note, done, date_id").order("created_at").limit(L),
    supabase.from("daily_answers").select("day, user_id, body").order("day").limit(L),
    supabase.from("daily_photos").select("day, user_id, storage_key, thumb_key, caption").order("day").limit(L),
    supabase.from("playlist_songs").select("title, artist, url, note, added_by, created_at").order("created_at").limit(L),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    me: { id: me.user_id, name: me.display_name },
    partner: partner ? { id: partner.user_id, name: partner.display_name } : null,
    couple: { name: couple.name, start_date: couple.start_date, playlist_url: couple.playlist_url, playlist_title: couple.playlist_title },
    dates: dates.data ?? [],
    media: media.data ?? [],
    lists: lists.data ?? [],
    items: items.data ?? [],
    answers: (answers.data ?? []).map((a) => ({ ...a, question: questionFor(couple.id, a.day) })),
    photos: photos.data ?? [],
    songs: songs.data ?? [],
  });
}
