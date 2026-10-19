import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { inQuietHours, localParts } from "@/lib/notify";
import { QUESTIONS } from "@/lib/questions";

/**
 * The day both of you share for the daily question and photo: the date in whichever
 * of your two timezones is further behind, so you always see the same day.
 */
export function ritualDay(tzA: string, tzB: string | null, now = new Date()) {
  const a = localParts(tzA, now).date;
  if (!tzB) return a;
  const b = localParts(tzB, now).date;
  return a < b ? a : b;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Same question for both of you; a different order for every couple; no repeats for 90 days. */
export function questionFor(coupleId: string, day: string) {
  const n = Math.floor(Date.parse(`${day}T00:00:00Z`) / 864e5);
  const N = QUESTIONS.length; // 90, and 7 shares no factor with 90, so the stride visits every question
  return QUESTIONS[(n * 7 + (hash(coupleId) % N)) % N];
}

/** Gentle push to your person. Respects their switch, quiet hours and lock-screen privacy. Never throws. */
export async function notifyPartner(partnerId: string, body: string, url: string) {
  try {
    const admin = supabaseAdmin();
    const [prefs, member, subs] = await Promise.all([
      admin.from("notification_prefs").select("enabled, private_preview").eq("user_id", partnerId).maybeSingle(),
      admin.from("members").select("timezone, quiet_start, quiet_end").eq("user_id", partnerId).maybeSingle(),
      admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", partnerId),
    ]);
    if (prefs.data && prefs.data.enabled === false) return;
    if (!subs.data?.length) return;
    if (member.data) {
      const lp = localParts(member.data.timezone, new Date());
      if (inQuietHours(member.data.quiet_start, member.data.quiet_end, lp.minutes)) return;
    }
    const text = prefs.data?.private_preview ? "You two have something to see ♥" : body;
    for (const s of subs.data) {
      const r = await sendPush(s, { title: "A Universe of Two", body: text, url, tag: "ritual" });
      if (r === "gone") await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  } catch {
    /* a failed push must never stop an answer or photo from saving */
  }
}
