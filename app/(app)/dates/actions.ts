"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORY_KEYS, diffDays, isValidKey } from "@/lib/dates";
import type { PairState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveDate(_prev: PairState, fd: FormData): Promise<PairState> {
  const id = str(fd, "id");
  const title = str(fd, "title");
  const date = str(fd, "date");
  const category = str(fd, "category");
  const icon = str(fd, "icon");
  const notes = str(fd, "notes");
  const location = str(fd, "location");
  const rating = Number(str(fd, "rating") || 0);
  const endDate = str(fd, "end_date");
  const inPerson = fd.get("in_person") === "on";

  if (title.length < 1 || title.length > 120) return { error: "Give it a title (up to 120 characters)." };
  if (!isValidKey(date)) return { error: "Pick a valid date." };
  if (!CATEGORY_KEYS.includes(category)) return { error: "Pick a category." };
  if (icon.length > 8) return { error: "That icon isn't valid." };
  if (notes.length > 4000) return { error: "Notes are too long (4000 characters max)." };
  if (location.length > 200) return { error: "Location is too long." };
  if (!Number.isInteger(rating) || rating < 0 || rating > 5) return { error: "Rating must be 1 to 5 stars." };

  if (endDate && (!isValidKey(endDate) || endDate < date || diffDays(date, endDate) > 120)) {
    return { error: "The end date must be on or after the start date, within 120 days." };
  }

  const row = {
    date, title, category,
    icon: icon || null,
    notes: notes || null,
    location: location || null,
    rating: rating || null,
    end_date: endDate || null,
    in_person: inPerson,
  };

  const supabase = await supabaseServer();
  if (id) {
    const { error } = await supabase.from("dates").update(row).eq("id", id);
    if (error) return { error: "We couldn't save that. Please try again." };
    revalidatePath("/calendar");
    redirect(`/dates/${id}`);
  }
  const { data: created, error } = await supabase.from("dates").insert(row).select("id").single();
  if (error || !created) return { error: "We couldn't save that. Please try again." };
  revalidatePath("/calendar");
  redirect(`/dates/${created.id}?new=1`);
}

export async function deleteDate(fd: FormData) {
  const id = str(fd, "id");
  const supabase = await supabaseServer();

  // Remove the files too, so deleted memories don't keep using storage
  const { data: files } = await supabase.from("media").select("storage_key, thumb_key").eq("date_id", id);
  const keys = (files ?? []).flatMap((f) => [f.storage_key, f.thumb_key].filter((k): k is string => !!k));

  const { error } = await supabase.from("dates").delete().eq("id", id);
  if (!error && keys.length) await supabase.storage.from("media").remove(keys);

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/calendar");
}

export async function deleteMedia(id: string): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const { data: m } = await supabase
    .from("media")
    .select("id, date_id, storage_key, thumb_key")
    .eq("id", id)
    .maybeSingle();
  if (!m) return { error: "That file was already removed." };

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { error: "Couldn't delete it. Please try again." };

  const keys = [m.storage_key, m.thumb_key].filter((k): k is string => !!k);
  await supabase.storage.from("media").remove(keys);

  revalidatePath(`/dates/${m.date_id}`);
  revalidatePath("/");
  return {};
}
