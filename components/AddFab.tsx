"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Floating "+" so adding a date is one tap from the main screens. */
export function AddFab() {
  const path = usePathname();
  if (!["/", "/calendar", "/timeline", "/stats"].includes(path)) return null;
  return (
    <Link
      href="/dates/new" aria-label="Add a date"
      className="fixed right-4 z-30 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full text-[#3d2b3a] shadow-soft transition-transform active:scale-95"
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))", background: "var(--accent)" }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </Link>
  );
}
