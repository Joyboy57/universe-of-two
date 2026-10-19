"use server";
import { randomBytes, createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function baseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Makes (or replaces) your private widget link. Only a hash is stored, so the link is shown just once. */
export async function createWidgetLink(): Promise<{ url?: string; site?: string; error?: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const token = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const admin = supabaseAdmin();
  const { error } = await admin.from("widget_tokens").upsert({ user_id: user.id, token_hash: hash, created_at: new Date().toISOString() });
  if (error) return { error: "We couldn't create the link. Please try again." };

  const site = await baseUrl();
  revalidatePath("/settings/widget");
  return { url: `${site}/api/widget/photo?t=${token}`, site };
}

export async function revokeWidgetLink(): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  const { error } = await supabaseAdmin().from("widget_tokens").delete().eq("user_id", user.id);
  if (error) return { error: "We couldn't turn it off." };
  revalidatePath("/settings/widget");
  return {};
}
