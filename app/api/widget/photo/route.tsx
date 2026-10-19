import { ImageResponse } from "next/og";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ritualDay } from "@/lib/ritual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZES = {
  small: { w: 600, h: 600, inset: 170 },
  medium: { w: 1200, h: 560, inset: 190 },
  large: { w: 1200, h: 1200, inset: 340 },
} as const;

const message = (w: number, h: number, big: string, small: string) => (
  <div style={{ width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #F9E4E8, #E8A0B4)", color: "#3D2B3A", textAlign: "center", padding: 40 }}>
    <div style={{ display: "flex", fontSize: Math.round(h * 0.09), fontWeight: 700 }}>{big}</div>
    <div style={{ display: "flex", fontSize: Math.round(h * 0.055), marginTop: 16 }}>{small}</div>
  </div>
);

// A private image for a home screen widget: your person's photo of the day, with yours as a small inset.
// Their photo only appears after you've shared yours, exactly like inside the app.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const key = (url.searchParams.get("size") ?? "small") as keyof typeof SIZES;
  const { w, h, inset } = SIZES[key] ?? SIZES.small;

  const respond = (jsx: React.ReactElement, status = 200, cache = "private, max-age=120") =>
    new ImageResponse(jsx, { width: w, height: h, status, headers: { "Cache-Control": cache } });

  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return respond(message(w, h, "Link not valid", "Make a new one in Settings"), 401, "no-store");

  const admin = supabaseAdmin();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: tok } = await admin.from("widget_tokens").select("user_id").eq("token_hash", hash).maybeSingle();
  if (!tok) return respond(message(w, h, "Link turned off", "Make a new one in Settings"), 401, "no-store");

  const { data: me } = await admin.from("members").select("user_id, couple_id, timezone").eq("user_id", tok.user_id).maybeSingle();
  if (!me) return respond(message(w, h, "Not paired yet", "Open the app to finish setup"), 404, "no-store");

  const { data: people } = await admin.from("members").select("user_id, timezone").eq("couple_id", me.couple_id);
  const partner = people?.find((p) => p.user_id !== me.user_id);
  const day = ritualDay(me.timezone, partner?.timezone ?? null);

  const { data: photos } = await admin.from("daily_photos").select("user_id, storage_key").eq("couple_id", me.couple_id).eq("day", day);
  const mine = photos?.find((p) => p.user_id === me.user_id);
  const theirs = photos?.find((p) => p.user_id !== me.user_id);

  const sign = async (k: string) => (await admin.storage.from("daily").createSignedUrl(k, 300)).data?.signedUrl;

  if (!mine) {
    return respond(message(w, h, "Today's photo", theirs ? "Share yours to see theirs" : "Share a photo to start"));
  }
  const mineUrl = await sign(mine.storage_key);
  if (!mineUrl) return respond(message(w, h, "Today's photo", "Couldn't load it"), 500, "no-store");

  if (!theirs) {
    return respond(
      <div style={{ width: w, height: h, display: "flex", position: "relative", background: "#F9E4E8" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mineUrl} width={w} height={h} style={{ width: w, height: h, objectFit: "cover" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.round(h * 0.16), display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(61,43,58,0.6)", color: "#FFFFFF", fontSize: Math.round(h * 0.06) }}>
          Waiting for their photo
        </div>
      </div>
    );
  }

  const theirUrl = await sign(theirs.storage_key);
  if (!theirUrl) return respond(message(w, h, "Today's photo", "Couldn't load it"), 500, "no-store");

  return respond(
    <div style={{ width: w, height: h, display: "flex", position: "relative", background: "#F9E4E8" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={theirUrl} width={w} height={h} style={{ width: w, height: h, objectFit: "cover" }} />
      <div style={{ position: "absolute", right: 24, bottom: 24, width: inset, height: inset, display: "flex", borderRadius: 28, border: "6px solid #FFFFFF", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mineUrl} width={inset} height={inset} style={{ width: inset, height: inset, objectFit: "cover" }} />
      </div>
    </div>
  );
}
