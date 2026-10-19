"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function regenerateInvite() {
  const supabase = await supabaseServer();
  await supabase.rpc("regenerate_invite");
  revalidatePath("/");
}
