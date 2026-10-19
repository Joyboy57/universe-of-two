import Link from "next/link";

const groups = [
  {
    title: "Us",
    links: [
      { href: "/timeline", icon: "🕰️", title: "Memories", text: "Your story, year by year" },
      { href: "/stats", icon: "📊", title: "Our numbers", text: "Days together, visits, favorites" },
      { href: "/playlist", icon: "🎧", title: "Our playlist", text: "Songs you picked for each other" },
    ],
  },
  {
    title: "This device",
    links: [
      { href: "/settings", icon: "🔔", title: "Notifications & look", text: "Reminders, time zone, effects" },
      { href: "/settings/security", icon: "🔒", title: "App lock", text: "PIN or fingerprint to open the app" },
      { href: "/settings/widget", icon: "🖼️", title: "Home screen widget", text: "Today's photo swap on your home screen" },
    ],
  },
  {
    title: "Keep it safe",
    links: [{ href: "/settings/backup", icon: "💾", title: "Backup", text: "Download everything you've made together" }],
  },
];

export default function MorePage() {
  return (
    <main className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">More</h1>
      {groups.map((g) => (
        <section key={g.title} className="space-y-3" aria-label={g.title}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{g.title}</h2>
          <ul className="space-y-3">
            {g.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="card flex items-center gap-4 !p-4 transition-transform hover:-translate-y-0.5">
                  <span className="text-3xl" aria-hidden="true">{l.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{l.title}</span>
                    <span className="block text-sm text-[var(--ink-soft)]">{l.text}</span>
                  </span>
                  <span aria-hidden="true" className="text-[var(--ink-soft)]">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
