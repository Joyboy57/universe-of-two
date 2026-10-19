// A convenience lock for THIS device: it stops someone who picks up your unlocked phone.
// The PIN is stored only as a salted hash in this browser. It is not a replacement for your phone's own lock.
export type LockConfig = { salt: string; hash: string; len: number; timeoutMs: number; cred?: string };

const KEY = "uo-lock";
export const UNLOCKED = "uo-unlocked";
const FAIL = "uo-lock-fail";

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function loadLock(): LockConfig | null {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as LockConfig) : null; } catch { return null; }
}
export function saveLock(c: LockConfig | null) {
  try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" }, key, 256);
  return b64(new Uint8Array(bits));
}

export async function makeLock(pin: string, timeoutMs: number, cred?: string): Promise<LockConfig> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: await derive(pin, salt), len: pin.length, timeoutMs, cred };
}
export async function checkPin(cfg: LockConfig, pin: string) {
  return (await derive(pin, unb64(cfg.salt))) === cfg.hash;
}

// ---- failed-attempt cool-down ----
export function lockedOutFor(): number {
  try {
    const f = JSON.parse(localStorage.getItem(FAIL) ?? "null") as { n: number; until: number } | null;
    return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
  } catch { return 0; }
}
export function recordFail() {
  try {
    const f = JSON.parse(localStorage.getItem(FAIL) ?? "null") as { n: number; until: number } | null;
    const n = (f?.n ?? 0) + 1;
    localStorage.setItem(FAIL, JSON.stringify({ n: n >= 5 ? 0 : n, until: n >= 5 ? Date.now() + 30_000 : 0 }));
    return n >= 5;
  } catch { return false; }
}
export function clearFails() { try { localStorage.removeItem(FAIL); } catch { /* ignore */ } }

// ---- fingerprint / Face ID (the phone's own check; PIN stays as the fallback) ----
export async function bioAvailable() {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch { return false; }
}
export async function bioRegister(): Promise<string | null> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "A Universe of Two" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "app-lock", displayName: "App lock" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    return cred ? b64(new Uint8Array(cred.rawId)) : null;
  } catch { return null; }
}
export async function bioVerify(cred: string) {
  try {
    const r = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: "public-key", id: unb64(cred) as BufferSource }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return !!r;
  } catch { return false; }
}
