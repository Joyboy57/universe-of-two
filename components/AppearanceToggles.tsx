"use client";
import { useEffect, useState } from "react";

function Toggle({ id, label, hint, defaultOn }: { id: string; label: string; hint: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  useEffect(() => {
    const v = localStorage.getItem(id);
    setOn(v === null ? defaultOn : v === "on");
  }, [id, defaultOn]);
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox" checked={on} className="mt-1 h-5 w-5 accent-[var(--accent-deep)]"
        onChange={(e) => {
          localStorage.setItem(id, e.target.checked ? "on" : "off");
          setOn(e.target.checked);
          location.reload(); // the effects start once, when the page loads
        }}
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-[var(--ink-soft)]">{hint}</span>
      </span>
    </label>
  );
}

export function AppearanceToggles() {
  return (
    <div className="card space-y-4">
      <Toggle id="uo-3d" defaultOn label="3D orbit scene" hint="Turn off to save battery. A light 2D version is used instead." />
      <Toggle id="uo-liquid" defaultOn={false} label="Liquid glass effect (experimental)" hint="Refracting glass on the clock cards. It can glitch on some phones, so it's off by default. These settings are per device." />
    </div>
  );
}
