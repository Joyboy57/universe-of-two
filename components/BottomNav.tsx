"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Home", match: ["/"], d: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/calendar", label: "Calendar", match: ["/calendar", "/dates"], d: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5" },
  { href: "/today", label: "Today", match: ["/today"], d: "M12 3v2M12 19v2M5 12H3M21 12h-2M7 7L5.6 5.6M18.4 18.4L17 17M17 7l1.4-1.4M5.6 18.4L7 17M12 8a4 4 0 100 8 4 4 0 000-8z" },
  { href: "/lists", label: "Lists", match: ["/lists"], d: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" },
  { href: "/more", label: "More", match: ["/more", "/timeline", "/stats", "/settings", "/playlist"], d: "M5 12h.01M12 12h.01M19 12h.01" },
];

export function BottomNav() {
  const path = usePathname();
  // The tapped tab lights up instantly, before the next page has finished loading
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => { setPending(null); }, [path]);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 8000);
    return () => clearTimeout(t);
  }, [pending]);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-3xl px-1 py-1.5">
        {items.map((it) => {
          const current = it.match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
          const active = pending ? pending === it.href : current;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={current ? "page" : undefined}
                onClick={() => { if (!current) setPending(it.href); }}
                className={`flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.7rem] font-semibold transition-transform active:scale-95 ${active ? "text-[var(--accent-deep)]" : "text-[var(--ink-soft)]"}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={it.label === "More" ? 3.2 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={it.d} />
                </svg>
                {it.label}
                {pending === it.href && <span className="sr-only">Loading</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
