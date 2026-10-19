"use client";
import { useEffect } from "react";

/** Puts a small number on the installed app's icon while something is waiting for you. */
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const n = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (count > 0) n.setAppBadge?.(count)?.catch(() => {});
      else n.clearAppBadge?.()?.catch(() => {});
    } catch { /* not supported */ }
  }, [count]);
  return null;
}
