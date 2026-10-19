import Link from "next/link";
import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { WidgetSetup } from "@/components/WidgetSetup";

export default async function WidgetPage() {
  const { user } = await getSpace();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("widget_tokens").select("user_id").eq("user_id", user.id).maybeSingle();

  return (
    <main className="space-y-6">
      <Link href="/more" className="text-sm text-[var(--ink-soft)] underline underline-offset-4">← More</Link>
      <h1 className="font-display text-3xl font-semibold">Home screen widget</h1>
      <WidgetSetup hasLink={!!data} />
    </main>
  );
}
