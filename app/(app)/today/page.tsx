import Link from "next/link";
import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { addDays, fmtLong, fmtShort } from "@/lib/dates";
import { questionFor, ritualDay } from "@/lib/ritual";
import { AnswerForm } from "@/components/AnswerForm";
import { PhotoSwap } from "@/components/PhotoSwap";
import { Reveal } from "@/components/Reveal";

type Ans = { day: string; user_id: string; body: string };
type Pho = { day: string; user_id: string; storage_key: string; thumb_key: string | null; caption: string | null };

export default async function TodayPage() {
  const { me, partner, couple } = await getSpace();
  if (!me || !couple) return null;

  if (!partner) {
    return (
      <main className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">Today</h1>
        <p className="text-[var(--ink-soft)]">The daily question and photo swap start once your person has joined. Share your invite code from Home.</p>
        <Link href="/" className="btn">Back to Home</Link>
      </main>
    );
  }

  const day = ritualDay(me.timezone, partner.timezone);
  const question = questionFor(couple.id, day);
  const supabase = await supabaseServer();

  const { data: st } = await supabase.rpc("ritual_status", { p_day: day });
  const s = st?.[0] ?? { i_answered: false, partner_answered: false, i_posted: false, partner_posted: false };

  const since = addDays(day, -14);
  const [{ data: ansRows }, { data: phoRows }] = await Promise.all([
    supabase.from("daily_answers").select("day, user_id, body").gte("day", since).lte("day", day).order("day", { ascending: false }),
    supabase.from("daily_photos").select("day, user_id, storage_key, thumb_key, caption").gte("day", since).lte("day", day).order("day", { ascending: false }),
  ]);
  const answers = (ansRows ?? []) as Ans[];
  const photos = (phoRows ?? []) as Pho[];

  // Private bucket: show full photos for today, thumbnails for the history
  const keys = photos.map((p) => (p.day === day ? p.storage_key : p.thumb_key ?? p.storage_key));
  const url = new Map<string, string>();
  if (keys.length) {
    const { data: signed } = await supabase.storage.from("daily").createSignedUrls(keys, 3600);
    for (const x of signed ?? []) if (x.path && x.signedUrl) url.set(x.path, x.signedUrl);
  }
  const photoUrl = (p: Pho) => url.get(p.day === day ? p.storage_key : p.thumb_key ?? p.storage_key);

  const name = (uid: string) => (uid === me.user_id ? "You" : partner.display_name);
  const myAnswer = answers.find((a) => a.day === day && a.user_id === me.user_id);
  const theirAnswer = answers.find((a) => a.day === day && a.user_id !== me.user_id);
  const myPhoto = photos.find((p) => p.day === day && p.user_id === me.user_id);
  const theirPhoto = photos.find((p) => p.day === day && p.user_id !== me.user_id);

  const pastDays = [...new Set([...answers, ...photos].map((x) => x.day).filter((d) => d < day))].sort().reverse().slice(0, 10);

  const PhotoCard = ({ p }: { p: Pho }) => {
    const src = photoUrl(p);
    return (
      <figure className="space-y-2">
        {src && (
          <a href={src} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${name(p.user_id)}'s photo of the day`} className="aspect-[4/5] w-full rounded-2xl object-cover" />
          </a>
        )}
        <figcaption className="text-sm text-[var(--ink-soft)]"><b>{name(p.user_id)}</b>{p.caption ? ` · ${p.caption}` : ""}</figcaption>
      </figure>
    );
  };

  return (
    <main className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Today</h1>
        <p className="text-[var(--ink-soft)]">{fmtLong(day)}</p>
      </div>

      {/* ---- Daily question ---- */}
      <section className="card space-y-4" aria-labelledby="q-h">
        <h2 id="q-h" className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Today's question</h2>
        <p className="font-display text-2xl font-semibold leading-snug">{question}</p>

        {!s.i_answered && (
          <AnswerForm day={day} partnerName={partner.display_name} partnerAnswered={s.partner_answered} />
        )}
        {s.i_answered && !theirAnswer && myAnswer && (
          <AnswerForm day={day} initial={myAnswer.body} partnerName={partner.display_name} partnerAnswered={false} />
        )}
        {s.i_answered && theirAnswer && myAnswer && (
          <Reveal id={`uo-revealed-q-${day}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[myAnswer, theirAnswer].map((a) => (
                <div key={a.user_id} className="rounded-2xl bg-[var(--bg)] p-4">
                  <p className="mb-1 text-sm font-semibold text-[var(--accent-deep)]">{name(a.user_id)}</p>
                  <p className="whitespace-pre-wrap">{a.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </section>

      {/* ---- Photo of the day ---- */}
      <section className="card space-y-4" aria-labelledby="p-h">
        <h2 id="p-h" className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Photo of the day</h2>
        <p className="font-display text-2xl font-semibold leading-snug">Share a photo of where you are or what you're doing.</p>

        {!s.i_posted && (
          <PhotoSwap day={day} coupleId={couple.id} userId={me.user_id} replace={false} partnerName={partner.display_name} partnerPosted={s.partner_posted} />
        )}
        {s.i_posted && !theirPhoto && myPhoto && (
          <div className="space-y-4">
            <div className="max-w-xs"><PhotoCard p={myPhoto} /></div>
            <p className="text-sm text-[var(--ink-soft)]">Waiting for {partner.display_name}'s photo. You can still change yours until they share.</p>
            <PhotoSwap day={day} coupleId={couple.id} userId={me.user_id} replace partnerName={partner.display_name} partnerPosted={false} />
          </div>
        )}
        {s.i_posted && theirPhoto && myPhoto && (
          <Reveal id={`uo-revealed-p-${day}`}>
            <div className="grid grid-cols-2 gap-3">
              <PhotoCard p={myPhoto} />
              <PhotoCard p={theirPhoto} />
            </div>
          </Reveal>
        )}
      </section>

      {/* ---- Playlist ---- */}
      <Link href="/playlist" className="card flex items-center gap-4 !p-4 transition-transform hover:-translate-y-0.5">
        <span className="text-3xl" aria-hidden="true">🎧</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Our playlist</span>
          <span className="block text-sm text-[var(--ink-soft)]">Add songs for each other and open them in Spotify</span>
        </span>
        <span aria-hidden="true" className="text-[var(--ink-soft)]">›</span>
      </Link>

      {/* ---- Previous days ---- */}
      {pastDays.length > 0 && (
        <section className="space-y-3" aria-labelledby="hist-h">
          <h2 id="hist-h" className="font-display text-xl font-semibold">Previous days</h2>
          <ul className="space-y-3">
            {pastDays.map((d) => {
              const a = answers.filter((x) => x.day === d);
              const p = photos.filter((x) => x.day === d);
              return (
                <li key={d} className="card space-y-3 !p-4">
                  <p className="text-sm font-semibold text-[var(--ink-soft)]">{fmtShort(d)}</p>
                  {a.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold">{questionFor(couple.id, d)}</p>
                      {a.map((x) => (
                        <p key={x.user_id} className="text-sm"><b className="text-[var(--accent-deep)]">{name(x.user_id)}:</b> {x.body}</p>
                      ))}
                    </div>
                  )}
                  {p.length > 0 && (
                    <div className="flex gap-2">
                      {p.map((x) => {
                        const src = photoUrl(x);
                        return src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={x.user_id} src={src} alt={`${name(x.user_id)}'s photo`} loading="lazy" className="h-24 w-24 rounded-xl object-cover" />
                        ) : null;
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
