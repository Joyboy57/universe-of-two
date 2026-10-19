import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Short-lived download links for files you are allowed to read (storage rules decide, not this code).
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { bucket?: string; keys?: unknown } | null;
  const bucket = body?.bucket;
  const keys = body?.keys;
  if ((bucket !== "media" && bucket !== "daily") || !Array.isArray(keys) || keys.length > 50 || !keys.every((k) => typeof k === "string" && k.length <= 300)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { data } = await supabase.storage.from(bucket).createSignedUrls(keys as string[], 3600);
  const urls: Record<string, string> = {};
  for (const x of data ?? []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl;
  return NextResponse.json({ urls });
}
