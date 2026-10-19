"use client";
import { useEffect, useState } from "react";

function Toggle({ id, label, hint }: { id: string; label: string; hint: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(localStorage.getItem(id) !== "off"), [id]);
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
      <Toggle id="uo-3d" label="3D orbit scene" hint="Turn off to save battery. A light 2D version is used instead." />
      <Toggle id="uo-liquid" label="Liquid glass effect (experimental)" hint="Refracting glass on the clock cards. Turn off if it feels slow or looks glitchy. These settings are per device." />
    </div>
  );
}
