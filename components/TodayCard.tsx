import Link from "next/link";

export type RitualStatus = { i_answered: boolean; partner_answered: boolean; i_posted: boolean; partner_posted: boolean };

function line(name: string, mine: boolean, theirs: boolean, what: string) {
  if (!mine) return theirs ? `${name} already shared ${what} ♥ Your turn` : `Waiting for you`;
  return theirs ? `You both shared ${what} ♥ See them` : `Waiting for ${name}`;
}

export function TodayCard({ partnerName, s }: { partnerName: string; s: RitualStatus }) {
  const done = s.i_answered && s.partner_answered && s.i_posted && s.partner_posted;
  return (
    <Link href="/today" className="card block w-full max-w-md space-y-2 text-left">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
        Today {done && <span className="beat" aria-hidden="true">♥</span>}
      </p>
      <p><span aria-hidden="true">❓</span> <b>Question:</b> {line(partnerName, s.i_answered, s.partner_answered, "an answer")}</p>
      <p><span aria-hidden="true">📸</span> <b>Photo:</b> {line(partnerName, s.i_posted, s.partner_posted, "a photo")}</p>
    </Link>
  );
}
