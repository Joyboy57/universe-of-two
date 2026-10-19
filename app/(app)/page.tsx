import Link from "next/link";
import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { Hero } from "@/components/Hero";
import { Countdown } from "@/components/Countdown";
import { AppBadge } from "@/components/AppBadge";
import { TodayCard, type RitualStatus } from "@/components/TodayCard";
import { ritualDay } from "@/lib/ritual";
import { providerOf } from "@/lib/playlist";
import { ShareInvite } from "@/components/ShareInvite";
import { STORAGE_LIMIT_BYTES } from "@/lib/media";
import { localParts } from "@/lib/notify";
import { journeyProgress, lastTogetherEnd, meetupStatus } from "@/lib/stats";
import { diffDays, type DateEntry } from "@/lib/dates";
import { regenerateInvite } from "./actions";

export default async function Home() {
  const { me, partner, couple } = await getSpace();
  if (!me || !couple) return null;

  // ---- Waiting for the second person ----
  if (!partner) {
    const expires = couple.invite_expires_at ? new Date(couple.invite_expires_at).getTime() : 0;
    const hoursLeft = Math.max(0, Math.round((expires - Date.now()) / 36e5));
    const live = !!couple.invite_code && hoursLeft > 0;
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const message = `Join me in A Universe of Two. Open ${site}/login, then choose "I have a code": ${couple.invite_code}`;

    return (
      <main className="flex flex-col items-center gap-8 pt-2 text-center">
        <Hero myName={me.display_name} partner={null} />
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold">Your space is ready, {me.display_name}</h1>
          <p className="text-[var(--ink-soft)]">Send this code to your person. It works once.</p>
        </div>
        <div className="card w-full max-w-sm space-y-4">
          {live ? (
            <>
              <p className="font-display text-4xl font-semibold tracking-[0.25em]">{couple.invite_code}</p>
              <p className="text-sm text-[var(--ink-soft)]">Expires in about {hoursLeft} hours</p>
              <ShareInvite text={message} />
            </>
          ) : (
            <p className="text-[var(--ink-soft)]">The last code expired. Make a new one.</p>
          )}
          <form action={regenerateInvite}>
            <button className="btn btn-quiet w-full">New code</button>
          </form>
        </div>
      </main>
    );
  }

  // ---- Both here ----
  const today = localParts(me.timezone, new Date()).date;
  const days = couple.start_date ? Math.max(0, diffDays(couple.start_date, today)) : null;

  const supabase = await supabaseServer();
  const { data: rows } = await supabase
    .from("dates")
    .select("id, date, end_date, title, category, icon, notes, location, rating, created_by, in_person")
    .eq("in_person", true)
    .limit(3000);
  const visits = (rows ?? []) as DateEntry[];
  const meetup = meetupStatus(visits, today);
  const lastEnd = lastTogetherEnd(visits, today);
  const sinceLast = meetup?.kind === "now" || !lastEnd ? null : diffDays(lastEnd, today);
  const progress = journeyProgress(visits, today, meetup);

  const { data: st } = await supabase.rpc("ritual_status", { p_day: ritualDay(me.timezone, partner.timezone) });
  const ritual = (st?.[0] ?? { i_answered: false, partner_answered: false, i_posted: false, partner_posted: false }) as RitualStatus;

  const { count: songCount } = await supabase.from("playlist_songs").select("id", { count: "exact", head: true });
  const { data: files } = await supabase.from("media").select("type, size_bytes").limit(10000);
  const photos = (files ?? []).filter((f) => f.type === "image").length;
  const videos = (files ?? []).filter((f) => f.type === "video").length;
  const used = (files ?? []).reduce((sum, f) => sum + Number(f.size_bytes), 0);
  const nearlyFull = used > STORAGE_LIMIT_BYTES * 0.8;

  return (
    <main className="flex flex-col items-center gap-8 pt-2 text-center">
      <Hero
        myName={me.display_name}
        partner={{
          name: partner.display_name,
          timezone: partner.timezone,
          quietStart: partner.quiet_start ?? null,
          quietEnd: partner.quiet_end ?? null,
        }}
      />
      <Countdown meetup={meetup} sinceLast={sinceLast} progress={progress} />
      <AppBadge count={(ritual.i_answered ? 0 : 1) + (ritual.i_posted ? 0 : 1)} />
      <TodayCard partnerName={partner.display_name} s={ritual} />
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">{me.display_name} & {partner.display_name}</h1>
        {days !== null && (
          <p className="font-hand text-3xl text-[var(--ink-soft)]">{days.toLocaleString()} days together</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/calendar" className="btn">Open our calendar</Link>
        <Link href="/stats" className="btn btn-quiet">Our numbers</Link>
      </div>
      {(songCount ?? 0) > 0 && (
        <Link href="/playlist" className="chip">
          <span aria-hidden="true">🎧</span> Our playlist · {songCount} {songCount === 1 ? "song" : "songs"}
        </Link>
      )}
      {photos + videos > 0 && (
        <p className={`text-sm ${nearlyFull ? "error" : "text-[var(--ink-soft)]"}`}>
          {photos} {photos === 1 ? "photo" : "photos"} · {videos} {videos === 1 ? "video" : "videos"} ·{" "}
          {Math.round(used / 1048576)} MB of 1 GB{nearlyFull ? ". Almost full." : ""}
        </p>
      )}
    </main>
  );
}
