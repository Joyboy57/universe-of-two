import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/** Current user + their space. RLS guarantees only this couple's rows come back. */
export const getSpace = cache(async () => {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select("user_id, couple_id, display_name, timezone, quiet_start, quiet_end, joined_at");

  const me = members?.find((m) => m.user_id === user.id) ?? null;
  if (!me) return { user, me: null, partner: null, couple: null };

  const partner = members?.find((m) => m.user_id !== user.id) ?? null;
  const { data: couple } = await supabase
    .from("couples")
    .select("id, name, start_date, invite_code, invite_expires_at, playlist_url, playlist_title")
    .eq("id", me.couple_id)
    .single();

  return { user, me, partner, couple };
});
