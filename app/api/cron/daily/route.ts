import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { addDays } from "@/lib/dates";
import { DEFAULT_PREFS, inQuietHours, localParts, pickNotification, type Entry, type Pick, type Prefs } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Vercel Cron calls this daily. Options for testing (need the secret):
//   ?dry=1    show what would be sent, send nothing
//   ?force=1  ignore the send hour, quiet hours and the once-a-day limit
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1";
  const now = new Date();
  const admin = supabaseAdmin();

  const { data: subs } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (!userIds.length) return NextResponse.json({ ok: true, note: "no subscribed devices" });

  const { data: members } = await admin
    .from("members").select("user_id, couple_id, timezone, quiet_start, quiet_end").in("user_id", userIds);
  const { data: prefRows } = await admin.from("notification_prefs").select("*").in("user_id", userIds);
  const coupleIds = [...new Set((members ?? []).map((m) => m.couple_id))];
  const { data: dateRows } = await admin
    .from("dates").select("id, couple_id, date, title, category, icon").in("couple_id", coupleIds).limit(20000);

  // for the daily question / photo nudge
  const { data: coupleMembers } = await admin.from("members").select("couple_id, timezone").in("couple_id", coupleIds);
  const since = addDays(now.toISOString().slice(0, 10), -3);
  const { data: answers } = await admin.from("daily_answers").select("couple_id, user_id, day").in("couple_id", coupleIds).gte("day", since);
  const { data: photos } = await admin.from("daily_photos").select("couple_id, user_id, day").in("couple_id", coupleIds).gte("day", since);

  const prefsBy = new Map((prefRows ?? []).map((p) => [p.user_id, p as Prefs]));
  const report: Record<string, unknown>[] = [];

  for (const m of members ?? []) {
    const prefs = prefsBy.get(m.user_id) ?? DEFAULT_PREFS;
    if (!prefs.enabled) { report.push({ user: m.user_id, skipped: "turned off" }); continue; }

    const lp = localParts(m.timezone, now);
    const hour = Math.floor(lp.minutes / 60);
    if (!force) {
      if (lp.minutes < prefs.send_hour * 60 || hour >= 21) { report.push({ user: m.user_id, skipped: "outside send window", localDate: lp.date }); continue; }
      if (inQuietHours(m.quiet_start, m.quiet_end, lp.minutes)) { report.push({ user: m.user_id, skipped: "quiet hours" }); continue; }
    }

    const entries = (dateRows ?? []).filter((d) => d.couple_id === m.couple_id) as Entry[];
    let pick: Pick | null = pickNotification(entries, lp.date, lp.weekday, prefs, m.user_id);

    // Lowest priority: nudge about today's question or photo, until they are done
    if (!pick && prefs.daily_ritual !== false) {
      const zones = (coupleMembers ?? []).filter((c) => c.couple_id === m.couple_id).map((c) => c.timezone);
      if (zones.length === 2) {
        const day = zones.map((tz) => localParts(tz, now).date).sort()[0];
        const mine = (rows: { couple_id: string; user_id: string; day: string }[] | null) =>
          (rows ?? []).some((r) => r.couple_id === m.couple_id && r.user_id === m.user_id && r.day === day);
        const hide = prefs.private_preview;
        if (!mine(answers)) pick = { kind: "ritual-question", body: hide ? "Something is waiting for you ♥" : "❓ Today's question is waiting for you", url: "/today", tag: "ritual" };
        else if (!mine(photos)) pick = { kind: "ritual-photo", body: hide ? "Something is waiting for you ♥" : "📸 Your turn to share today's photo", url: "/today", tag: "ritual" };
      }
    }

    if (!pick) { report.push({ user: m.user_id, skipped: "nothing to say today", localDate: lp.date }); continue; }
    if (dry) { report.push({ user: m.user_id, wouldSend: pick, localDate: lp.date }); continue; }

    if (!force) {
      const { error } = await admin.from("notification_log").insert({ user_id: m.user_id, local_date: lp.date, kind: pick.kind });
      if (error) { report.push({ user: m.user_id, skipped: "already sent today" }); continue; }
    }

    let delivered = 0;
    for (const s of (subs ?? []).filter((x) => x.user_id === m.user_id)) {
      const r = await sendPush(s, { title: "A Universe of Two", body: pick.body, url: pick.url, tag: pick.tag });
      if (r === "ok") delivered++;
      if (r === "gone") await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
    if (!force && delivered === 0) await admin.from("notification_log").delete().eq("user_id", m.user_id).eq("local_date", lp.date);
    report.push({ user: m.user_id, sent: pick.kind, delivered });
  }
  return NextResponse.json({ ok: true, dry, force, report });
}
