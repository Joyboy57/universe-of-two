"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { PairState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
// P0001 = our own raise exception messages, which are safe to show
const friendly = (e: { code?: string; message: string }) =>
  e.code === "P0001" ? e.message : "Something went wrong. Please try again.";

export async function createSpace(_prev: PairState, fd: FormData): Promise<PairState> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("create_couple", {
    p_name: str(fd, "name") || null,
    p_display_name: str(fd, "displayName"),
    p_timezone: str(fd, "tz") || "UTC",
    p_start_date: str(fd, "startDate") || null,
  });
  if (error) return { error: friendly(error) };
  redirect("/");
}

export async function joinSpace(_prev: PairState, fd: FormData): Promise<PairState> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("join_couple", {
    p_code: str(fd, "code"),
    p_display_name: str(fd, "displayName"),
    p_timezone: str(fd, "tz") || "UTC",
  });
  if (error) return { error: friendly(error) };
  redirect("/");
}
