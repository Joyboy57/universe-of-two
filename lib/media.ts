export const MAX_FILE_BYTES = 50 * 1024 * 1024; // Supabase free plan per-file maximum
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // free plan total (1 GB)
const MAX_IMAGE_EDGE = 2000;
const THUMB_EDGE = 480;

export type MediaItem = {
  id: string;
  type: "image" | "video";
  mime: string | null;
  size_bytes: number;
  width: number | null;
  height: number | null;
  uploaded_by: string;
  created_at: string;
  url: string;
  thumbUrl: string | null;
};

const VIDEO_BY_EXT: Record<string, string> = {
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm",
};
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/** Returns the video mime type for a picked file, or null if it isn't a supported video. */
export function videoMime(file: File): string | null {
  if (VIDEO_TYPES.includes(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!file.type || file.type.startsWith("video/")) return VIDEO_BY_EXT[ext] ?? null;
  return null;
}

export function extFor(mime: string) {
  return (
    { "image/jpeg": "jpg", "image/gif": "gif", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" } as Record<string, string>
  )[mime] ?? "bin";
}

// ---------- client-side helpers (browser only) ----------

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function draw(source: CanvasImageSource, sw: number, sh: number, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process this photo.");
  ctx.fillStyle = "#fff"; // JPEG has no transparency
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Your browser couldn't prepare this photo.");
  return { blob, width, height };
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error("Couldn't read this photo. Try a JPG or PNG.");
    }
  }
}

export async function prepareImage(file: File) {
  const bitmap = await decode(file);
  const thumb = (await draw(bitmap, bitmap.width, bitmap.height, THUMB_EDGE, 0.75)).blob;

  if (file.type === "image/gif") {
    const out = { main: file as Blob, mime: "image/gif", width: bitmap.width, height: bitmap.height, thumb };
    bitmap.close();
    return out;
  }
  const full = await draw(bitmap, bitmap.width, bitmap.height, MAX_IMAGE_EDGE, 0.82);
  bitmap.close();
  return { main: full.blob, mime: "image/jpeg", width: full.width, height: full.height, thumb };
}

export async function prepareVideo(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    await withTimeout(
      new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("video")); }),
      10000
    );
    v.currentTime = Math.min(1, (v.duration || 2) / 2);
    await withTimeout(new Promise<void>((res) => { v.onseeked = () => res(); }), 5000);
    const t = await draw(v, v.videoWidth, v.videoHeight, THUMB_EDGE, 0.75);
    return { thumb: t.blob as Blob | null, width: v.videoWidth || null, height: v.videoHeight || null };
  } catch {
    return { thumb: null as Blob | null, width: null as number | null, height: null as number | null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Daily photo: always JPEG, longest side `edge`, plus a small thumbnail for the history grid. */
export async function prepareJpegPair(file: File, edge = 1600) {
  const bitmap = await decode(file);
  const main = await draw(bitmap, bitmap.width, bitmap.height, edge, 0.82);
  const thumb = await draw(bitmap, bitmap.width, bitmap.height, THUMB_EDGE, 0.75);
  bitmap.close();
  return { main: main.blob, thumb: thumb.blob };
}
