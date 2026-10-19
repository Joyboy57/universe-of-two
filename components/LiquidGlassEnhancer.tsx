"use client";
import { useEffect } from "react";

/**
 * Upgrades elements matching `selector` from plain CSS glass to liquidGL's refracting WebGL glass.
 * Skipped when: the user switched it off in Settings, "reduce motion" is on, or anything fails.
 * In every skipped/failed case the CSS glass stays, so the page always looks right.
 */
export function LiquidGlassEnhancer({ selector }: { selector: string }) {
  useEffect(() => {
    if (localStorage.getItem("uo-liquid") !== "on") return; // opt-in: it is experimental
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let instance: unknown;

    const timer = setTimeout(async () => {
      try {
        const { default: liquidGL } = await import("liquid-gl");
        if (cancelled || !document.querySelector(selector)) return;
        instance = liquidGL({
          target: selector,
          snapshot: "body",
          resolution: 1.5,
          refraction: 0.02,
          bevelDepth: 0.09,
          bevelWidth: 0.2,
          frost: 1.2,
          shadow: true,
          specular: true,
          reveal: "fade",
          tilt: false,
          magnify: 1,
          on: { init: () => document.documentElement.setAttribute("data-lg", "on") },
        });
      } catch {
        /* keep the CSS glass */
      }
    }, 900); // let fonts and layout settle before the page snapshot

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.documentElement.removeAttribute("data-lg");
      try { (instance as { destroy?: () => void } | undefined)?.destroy?.(); } catch { /* not all versions have it */ }
    };
  }, [selector]);

  return null;
}
