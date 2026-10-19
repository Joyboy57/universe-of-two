"use client";
import { useActionState, useEffect, useState } from "react";
import { savePrefs } from "@/app/(app)/settings/actions";
import type { FormState } from "@/lib/types";
import type { Prefs } from "@/lib/notify";

type Props = {
  displayName: string; timezone: string; quietStart: string; quietEnd: string; prefs: Prefs;
};

const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;

export function SettingsForm({ displayName, timezone, quietStart, quietEnd, prefs }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePrefs, {});
  const [tz, setTz] = useState(timezone);
  const [zones, setZones] = useState<string[]>([]);
  const [device, setDevice] = useState("");

  useEffect(() => {
    setDevice(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (fn) setZones(fn("timeZone"));
  }, []);

  const toggles: [string, string, boolean][] = [
    ["enabled", "Notifications on (master switch)", prefs.enabled],
    ["plans", "Reminders for plans (a week before, the day before, the day of)", prefs.plans],
    ["on_this_day", "“On this day” memories from earlier years", prefs.on_this_day],
    ["random_memory", "A random memory on Sundays", prefs.random_memory],
    ["daily_ritual", "A nudge for today's question and photo (stops once you've done both)", prefs.daily_ritual],
    ["private_preview", "Hide details on my lock screen", prefs.private_preview],
  ];

  return (
    <form action={action} className="card space-y-6">
      <div>
        <label htmlFor="displayName" className="label">Your name</label>
        <input id="displayName" name="displayName" required maxLength={40} defaultValue={displayName} className="input" />
      </div>

      <div>
        <label htmlFor="timezone" className="label">Your timezone</label>
        <input id="timezone" name="timezone" list="zones" required value={tz} onChange={(e) => setTz(e.target.value)} className="input" />
        <datalist id="zones">{zones.map((z) => <option key={z} value={z} />)}</datalist>
        {device && device !== tz && (
          <button type="button" className="mt-2 text-sm underline underline-offset-4" onClick={() => setTz(device)}>
            Use this device&apos;s timezone ({device})
          </button>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="label">What should reach you?</legend>
        {toggles.map(([name, text, checked]) => (
          <label key={name} className="flex min-h-11 items-center gap-3">
            <input type="checkbox" name={name} defaultChecked={checked} className="h-5 w-5 accent-[var(--accent-deep)]" />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <label htmlFor="sendHour" className="label">Send my daily note at (your time)</label>
        <select id="sendHour" name="sendHour" defaultValue={String(prefs.send_hour)} className="input">
          {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">At most one gentle notification a day.</p>
      </div>

      <fieldset>
        <legend className="label">Quiet hours (optional)</legend>
        <div className="flex items-center gap-3">
          <input type="time" name="quietStart" defaultValue={quietStart} className="input" aria-label="Quiet hours start" />
          <span>to</span>
          <input type="time" name="quietEnd" defaultValue={quietEnd} className="input" aria-label="Quiet hours end" />
        </div>
      </fieldset>

      {state.error && <p role="alert" className="error">{state.error}</p>}
      {state.ok && <p role="status" className="text-[var(--accent-deep)]">Saved ♥</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
