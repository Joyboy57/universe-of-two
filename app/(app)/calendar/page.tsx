import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { CalendarView } from "@/components/CalendarView";
import { isValidKey, type DateEntry } from "@/lib/dates";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { me, partner, couple } = await getSpace();
  if (!me) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("dates")
    .select("id, date, end_date, title, category, icon, notes, location, rating, created_by, in_person")
    .order("date", { ascending: true })
    .limit(3000);

  const names: Record<string, string> = { [me.user_id]: "you" };
  if (partner) names[partner.user_id] = partner.display_name;

  return (
    <main className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Our calendar</h1>
      <CalendarView
        entries={(data ?? []) as DateEntry[]}
        names={names}
        savedKey={saved && isValidKey(saved) ? saved : undefined}
        startDate={couple?.start_date ?? null}
      />
    </main>
  );
}
