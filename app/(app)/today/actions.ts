"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getSpace } from "@/lib/session";
import { notifyPartner } from "@/lib/ritual";
import { isValidKey } from "@/lib/dates";
import type { FormState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveAnswer(_prev: FormState, fd: FormData): Promise<FormState> {
  const day = str(fd, "day");
  const body = str(fd, "body");
  if (!isValidKey(day)) return { error: "Something went wrong. Reload the page and try again." };
  if (body.length < 1 || body.length > 1000) return { error: "Write something (up to 1000 characters)." };

  const { me, partner } = await getSpace();
  if (!me || !partner) return { error: "Your person needs to join first." };

  const supabase = await supabaseServer();
  const { data: mine } = await supabase.from("daily_answers").select("id").eq("day", day).eq("user_id", me.user_id).maybeSingle();

  if (mine) {
    const { data, error } = await supabase.from("daily_answers").update({ body }).eq("id", mine.id).select("id");
    if (error || !data?.length) return { error: `${partner.display_name} already answered, so yours is locked in ♥` };
  } else {
    const { error } = await supabase.from("daily_answers").insert({ day, body });
    if (error) return { error: "We couldn't save that. Please try again." };
    const { data: st } = await supabase.rpc("ritual_status", { p_day: day });
    if (st?.[0]?.partner_answered) {
      await notifyPartner(partner.user_id, `${me.display_name} answered today's question ♥ Come see what you both wrote.`, "/today");
    }
  }
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}

/** Called after the browser has uploaded the photo and saved its row. */
export async function photoPosted(day: string): Promise<{ error?: string }> {
  if (!isValidKey(day)) return { error: "Invalid day." };
  const { me, partner } = await getSpace();
  if (!me || !partner) return { error: "Your person needs to join first." };

  const supabase = await supabaseServer();
  const { data: st } = await supabase.rpc("ritual_status", { p_day: day });
  if (!st?.[0]?.i_posted) return { error: "The photo didn't save. Please try again." };
  if (st[0].partner_posted) {
    await notifyPartner(partner.user_id, `${me.display_name} shared today's photo ♥ Come see both of them.`, "/today");
  }
  revalidatePath("/today");
  revalidatePath("/");
  return {};
}

export async function removePhoto(day: string): Promise<{ error?: string }> {
  if (!isValidKey(day)) return { error: "Invalid day." };
  const { me, partner } = await getSpace();
  if (!me) return { error: "Please sign in again." };

  const supabase = await supabaseServer();
  const { data: row } = await supabase
    .from("daily_photos").select("id, storage_key, thumb_key").eq("day", day).eq("user_id", me.user_id).maybeSingle();
  if (!row) return {};

  const { data, error } = await supabase.from("daily_photos").delete().eq("id", row.id).select("id");
  if (error || !data?.length) return { error: `${partner?.display_name ?? "Your person"} already shared theirs, so yours is locked in ♥` };

  await supabase.storage.from("daily").remove([row.storage_key, row.thumb_key].filter((k): k is string => !!k));
  revalidatePath("/today");
  return {};
}

export async function savePlaylist(_prev: FormState, fd: FormData): Promise<FormState> {
  const rawUrl = str(fd, "url");
  const title = str(fd, "title");
  if (title.length > 80) return { error: "Keep the name under 80 characters." };

  let url: string | null = null;
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
      url = u.toString();
    } catch {
      return { error: "Paste a full link that starts with https://" };
    }
    if (url.length > 500) return { error: "That link is too long." };
  }

  const { couple } = await getSpace();
  if (!couple) return { error: "Please sign in again." };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("couples").update({ playlist_url: url, playlist_title: url ? title || null : null }).eq("id", couple.id);
  if (error) return { error: "We couldn't save that. Please try again." };

  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}
