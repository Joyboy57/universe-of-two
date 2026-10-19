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
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(180deg, #f2b6c7, #e8a0b4)", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 12px 28px -8px rgba(232,160,180,0.65), inset 0 1px 0 rgba(255,255,255,0.6)" }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </Link>
  );
}
