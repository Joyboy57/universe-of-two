import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { kindInfo, type ListItem } from "@/lib/lists";
import { ListView } from "@/components/ListView";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteList } from "../actions";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: list } = await supabase.from("lists").select("id, title, kind").eq("id", id).maybeSingle();
  if (!list) notFound();

  const { data: items } = await supabase
    .from("list_items").select("id, text, note, done, date_id").eq("list_id", id)
    .order("created_at", { ascending: false }).limit(1000);
  const k = kindInfo(list.kind);

  return (
    <main className="space-y-6">
      <Link href="/lists" className="text-sm text-[var(--ink-soft)] underline underline-offset-4">← All lists</Link>
      <h1 className="font-display text-3xl font-semibold"><span aria-hidden="true">{k.icon}</span> {list.title}</h1>
      <ListView listId={list.id} placeholder={k.placeholder} initial={(items ?? []) as ListItem[]} />
      <form action={deleteList}>
        <input type="hidden" name="id" value={list.id} />
        <ConfirmButton message="Delete this whole list for both of you? This can't be undone.">Delete list</ConfirmButton>
      </form>
    </main>
  );
}
