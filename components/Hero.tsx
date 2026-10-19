"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Orbit } from "@/components/Orbit";
import { LiquidGlassEnhancer } from "@/components/LiquidGlassEnhancer";
import { daylight, fmtDiff, partOfDay, timeIn, tzOffsetMin, type Snap } from "@/lib/tz";
import { inQuietHours } from "@/lib/notify";

const Scene = dynamic(() => import("@/components/UniverseScene"), {
  ssr: false,
  loading: () => <Orbit size="12rem" />,
});

type Partner = { name: string; timezone: string; quietStart: string | null; quietEnd: string | null };
type Env = { gl: boolean; still: boolean; small: boolean };

function ClockCard({ label, snap, children }: { label: string; snap: Snap | null; children?: React.ReactNode }) {
  return (
    <div className="liquidGL glass-clock" style={{ zIndex: 5 }}>
      <div className="lg-content">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
        <p className="font-display text-3xl font-semibold leading-tight">{snap ? snap.time : "—"}</p>
        <p className="text-sm text-[var(--ink-soft)]">{snap ? `${snap.weekday} · ${partOfDay(snap.hour)}` : "\u00a0"}</p>
        {children}
      </div>
    </div>
  );
}

export function Hero({ myName, partner }: { myName: string; partner: Partner | null }) {
  const [now, setNow] = useState<Date | null>(null);
  const [myTz, setMyTz] = useState<string | null>(null);
  const [env, setEnv] = useState<Env | null>(null);

  useEffect(() => {
    setNow(new Date());
    setMyTz(Intl.DateTimeFormat().resolvedOptions().timeZone); // your device's zone, so it stays right when you travel
    const id = setInterval(() => setNow(new Date()), 10000);

    let gl = false;
    try {
      const c = document.createElement("canvas");
      gl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { /* no WebGL */ }
    setEnv({
      gl: gl && localStorage.getItem("uo-3d") !== "off",
      still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      small: window.innerWidth < 640,
    });
    return () => clearInterval(id);
  }, []);

  const me = now && myTz ? timeIn(myTz, now) : null;
  const them = now && partner ? timeIn(partner.timezone, now) : null;
  const diff = now && myTz && partner ? tzOffsetMin(partner.timezone, now) - tzOffsetMin(myTz, now) : null;

  const asleep =
    them && partner
      ? partner.quietStart && partner.quietEnd
        ? inQuietHours(partner.quietStart, partner.quietEnd, them.minutes)
        : them.minutes >= 23 * 60 || them.minutes < 7 * 60
      : false;

  const frac = (s: Snap) => s.hour + (s.minutes % 60) / 60;

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="relative h-64 w-full max-w-md sm:h-72"
        role="img"
        aria-label={partner ? `${myName} and ${partner.name} orbiting each other` : `${myName} waiting for their person`}
      >
        {env?.gl && me ? (
          <Scene
            meDaylight={daylight(frac(me))}
            partnerDaylight={them ? daylight(frac(them)) : null}
            single={!partner}
            still={env.still}
            dust={env.small ? 70 : 140}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Orbit size="12rem" single={!partner} />
          </div>
        )}
      </div>

      <div className={`relative z-[5] -mt-6 grid w-full max-w-md gap-3 ${partner ? "grid-cols-2" : "mx-auto max-w-[14rem] grid-cols-1"}`}>
        <ClockCard label="You" snap={me} />
        {partner && (
          <ClockCard label={partner.name} snap={them}>
            <p className="mt-1 text-sm">{asleep ? "🌙 Probably asleep" : "💬 Good time to message"}</p>
          </ClockCard>
        )}
      </div>

      {partner && diff !== null && (
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          {diff === 0 ? "You're in the same time zone" : `${partner.name} is ${fmtDiff(diff)} ${diff > 0 ? "ahead of" : "behind"} you`}
        </p>
      )}

      {env && now && <LiquidGlassEnhancer selector=".liquidGL" />}
    </div>
  );
}
