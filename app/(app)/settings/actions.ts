"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import type { FormState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const on = (fd: FormData, k: string) => fd.get(k) === "on";
const validTz = (tz: string) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };
const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export async function savePrefs(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const name = str(fd, "displayName");
  const tz = str(fd, "timezone");
  const qs = str(fd, "quietStart");
  const qe = str(fd, "quietEnd");
  const hour = Number(str(fd, "sendHour"));

  if (name.length < 1 || name.length > 40) return { error: "Your name must be 1 to 40 characters." };
  if (!validTz(tz)) return { error: "That timezone isn't valid. Pick one from the list." };
  if ((qs && !validTime(qs)) || (qe && !validTime(qe))) return { error: "Quiet hours need valid times." };
  if ((qs && !qe) || (!qs && qe)) return { error: "Set both a start and an end for quiet hours, or leave both empty." };
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { error: "Pick a valid send time." };

  const m = await supabase.from("members")
    .update({ display_name: name, timezone: tz, quiet_start: qs || null, quiet_end: qe || null })
    .eq("user_id", user.id);
  if (m.error) return { error: "We couldn't save that. Please try again." };

  const p = await supabase.from("notification_prefs").upsert({
    user_id: user.id,
    enabled: on(fd, "enabled"), on_this_day: on(fd, "on_this_day"), plans: on(fd, "plans"),
    random_memory: on(fd, "random_memory"), daily_ritual: on(fd, "daily_ritual"), private_preview: on(fd, "private_preview"), send_hour: hour,
  });
  if (p.error) return { error: "We couldn't save that. Please try again." };

  revalidatePath("/settings");
  return { ok: true };
}

type SubJson = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function saveSubscription(sub: SubJson, userAgent: string): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const endpoint = sub.endpoint ?? "";
  const p256dh = sub.keys?.p256dh ?? "";
  const auth = sub.keys?.auth ?? "";
  if (!endpoint.startsWith("https://") || endpoint.length > 2000 || !p256dh || !auth) return { error: "Invalid subscription." };

  // The server writes this (user id comes from the verified session). A device that switches accounts is re-assigned.
  const admin = supabaseAdmin();
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await admin.from("push_subscriptions").insert({
    user_id: user.id, endpoint, p256dh, auth, user_agent: userAgent.slice(0, 200),
  });
  if (error) return { error: "Couldn't turn on notifications. Try again." };
  return {};
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function sendTestPush(): Promise<{ sent: number; error?: string }> {
  const supabase = await supabaseServer();
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!subs?.length) return { sent: 0, error: "No device is subscribed yet. Turn notifications on first." };

  let sent = 0;
  try {
    for (const s of subs) {
      const r = await sendPush(s, { title: "A Universe of Two", body: "It works ♥ Notifications are on for this device.", url: "/settings", tag: "test" });
      if (r === "ok") sent++;
      if (r === "gone") await supabase.from("push_subscriptions").delete().eq("id", s.id);
    }
  } catch {
    return { sent: 0, error: "Push keys are missing on the server. Check VAPID settings." };
  }
  return sent ? { sent } : { sent: 0, error: "The device didn't accept the message. Turn notifications off and on again." };
}
