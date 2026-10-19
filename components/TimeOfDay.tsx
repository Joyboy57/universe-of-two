"use client";
import { useEffect } from "react";

/** Tints the background glow to the viewer's local time: dawn, day, dusk or night. */
export function TimeOfDay() {
  useEffect(() => {
    const set = () => {
      const h = new Date().getHours();
      document.documentElement.dataset.tod = h >= 5 && h < 8 ? "dawn" : h < 17 && h >= 8 ? "day" : h >= 17 && h < 20 ? "dusk" : "night";
    };
    set();
    const id = setInterval(set, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}
