import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { DateForm } from "@/components/DateForm";
import type { DateEntry } from "@/lib/dates";

export default async function EditDate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("dates")
    .select("id, date, end_date, title, category, icon, notes, location, rating, created_by, in_person")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const e = data as DateEntry;

  return (
    <main className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Edit date</h1>
      <DateForm initial={e} cancelHref={`/dates/${e.id}`} />
    </main>
  );
}
