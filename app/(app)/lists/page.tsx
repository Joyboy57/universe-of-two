import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { kindInfo } from "@/lib/lists";
import { NewListForm } from "@/components/NewListForm";
import { createBasics } from "./actions";

export default async function ListsPage() {
  const supabase = await supabaseServer();
  const { data: lists } = await supabase.from("lists").select("id, title, kind").order("created_at", { ascending: true });
  const { data: items } = await supabase.from("list_items").select("list_id, done").limit(5000);

  const total = new Map<string, number>();
  const done = new Map<string, number>();
  for (const i of items ?? []) {
    total.set(i.list_id, (total.get(i.list_id) ?? 0) + 1);
    if (i.done) done.set(i.list_id, (done.get(i.list_id) ?? 0) + 1);
  }

  return (
    <main className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Lists</h1>

      {(lists ?? []).length === 0 ? (
        <div className="card space-y-3">
          <p className="font-display text-xl font-semibold">Dreams and plans, together</p>
          <p className="text-[var(--ink-soft)]">Start with a bucket list, a watchlist and a food list. You can add your own later.</p>
          <form action={createBasics}><button className="btn">Start with the basics</button></form>
        </div>
      ) : (
        <ul className="space-y-3">
          {(lists ?? []).map((l) => {
            const k = kindInfo(l.kind);
            const t = total.get(l.id) ?? 0;
            const d = done.get(l.id) ?? 0;
            return (
              <li key={l.id}>
                <Link href={`/lists/${l.id}`} className="card block space-y-2 !p-4 transition-transform hover:-translate-y-0.5">
                  <span className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">{k.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.title}</span>
                      <span className="block text-sm text-[var(--ink-soft)]">{t === 0 ? "Empty" : `${d} of ${t} done`}</span>
                    </span>
                  </span>
                  {t > 0 && (
                    <span className="block h-2 overflow-hidden rounded-full bg-[var(--line)]">
                      <span className="block h-full rounded-full" style={{ width: `${(d / t) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-deep))" }} />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <details className="space-y-3">
        <summary className="btn btn-quiet cursor-pointer">New list</summary>
        <div className="mt-3"><NewListForm /></div>
      </details>
    </main>
  );
}
