import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { searchSongs } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: await searchSongs(q) });
}
