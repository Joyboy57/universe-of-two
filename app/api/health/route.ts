import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Setup check: confirms env vars are set and Supabase (auth + media bucket) is reachable.
// Reports booleans only, never values.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const env = { supabaseUrl: !!url, supabaseAnon: !!anon, supabaseService: !!service };

  let supabaseOk = false;
  let mediaBucketOk = false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon ?? "" } });
    supabaseOk = res.ok;
  } catch {}
  try {
    const res = await fetch(`${url}/storage/v1/bucket/media`, {
      headers: { apikey: service ?? "", Authorization: `Bearer ${service ?? ""}` },
    });
    mediaBucketOk = res.ok;
  } catch {}

  const ok = Object.values(env).every(Boolean) && supabaseOk && mediaBucketOk;
  return NextResponse.json({ ok, env, supabaseOk, mediaBucketOk }, { status: ok ? 200 : 503 });
}
