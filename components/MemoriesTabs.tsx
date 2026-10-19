import Link from "next/link";

export function MemoriesTabs({ active }: { active: "timeline" | "stats" }) {
  const tab = (href: string, label: string, key: "timeline" | "stats") => (
    <Link href={href} className="chip" aria-pressed={active === key} aria-current={active === key ? "page" : undefined}>{label}</Link>
  );
  return <div className="flex gap-2">{tab("/timeline", "Timeline", "timeline")}{tab("/stats", "Stats", "stats")}</div>;
}
