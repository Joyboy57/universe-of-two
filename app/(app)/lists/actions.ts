"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getSpace } from "@/lib/session";
import { localParts } from "@/lib/notify";
import { KINDS, kindInfo, type ListItem } from "@/lib/lists";
import type { FormState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const ITEM_COLUMNS = "id, text, note, done, date_id";

export async function createList(_prev: FormState, fd: FormData): Promise<FormState> {
  const title = str(fd, "title");
  const kind = str(fd, "kind");
  if (title.length < 1 || title.length > 80) return { error: "Give the list a name (up to 80 characters)." };
  if (!KINDS.some((k) => k.key === kind)) return { error: "Pick a type." };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("lists").insert({ title, kind }).select("id").single();
  if (error || !data) return { error: "We couldn't create that. Please try again." };
  revalidatePath("/lists");
  redirect(`/lists/${data.id}`);
}

export async function createBasics() {
  const supabase = await supabaseServer();
  await supabase.from("lists").insert([
    { title: "Bucket list", kind: "bucket" },
    { title: "Watchlist", kind: "watch" },
    { title: "Food list", kind: "food" },
  ]);
  revalidatePath("/lists");
  redirect("/lists");
}

export async function deleteList(fd: FormData) {
  const id = str(fd, "id");
  const supabase = await supabaseServer();
  await supabase.from("lists").delete().eq("id", id);
  revalidatePath("/lists");
  redirect("/lists");
}

export async function addItem(listId: string, text: string): Promise<{ item?: ListItem; error?: string }> {
  const t = text.trim();
  if (t.length < 1 || t.length > 200) return { error: "Keep it under 200 characters." };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("list_items").insert({ list_id: listId, text: t }).select(ITEM_COLUMNS).single();
  if (error || !data) return { error: "We couldn't add that. Please try again." };
  revalidatePath("/lists");
  return { item: data as ListItem };
}

export async function toggleItem(id: string, done: boolean): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("list_items").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { error: "We couldn't update that. Please try again." };
  revalidatePath("/lists");
  return {};
}

export async function removeItem(id: string): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("list_items").delete().eq("id", id);
  if (error) return { error: "We couldn't remove that." };
  revalidatePath("/lists");
  return {};
}

/** Turns a ticked-off item into a calendar date (today), so the memory is kept. */
export async function itemToDate(id: string): Promise<{ dateId?: string; error?: string }> {
  const { me } = await getSpace();
  if (!me) return { error: "Please sign in again." };

  const supabase = await supabaseServer();
  const { data: row } = await supabase.from("list_items").select("id, text, date_id, lists(kind)").eq("id", id).maybeSingle();
  if (!row) return { error: "That item no longer exists." };
  if (row.date_id) return { dateId: row.date_id };

  const rel = row.lists as { kind?: string } | { kind?: string }[] | null;
  const kind = Array.isArray(rel) ? rel[0]?.kind : rel?.kind;
  const today = localParts(me.timezone, new Date()).date;

  const { data: date, error } = await supabase
    .from("dates").insert({ date: today, title: row.text.slice(0, 120), category: kindInfo(kind ?? "custom").category })
    .select("id").single();
  if (error || !date) return { error: "We couldn't add it to the calendar." };

  await supabase.from("list_items").update({ date_id: date.id, done: true, done_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/lists");
  revalidatePath("/calendar");
  return { dateId: date.id };
}
