"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Orbit } from "@/components/Orbit";
import { signOut } from "@/app/(app)/actions";
import { UNLOCKED, bioVerify, checkPin, clearFails, loadLock, lockedOutFor, recordFail, type LockConfig } from "@/lib/applock";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"] as const;

export function AppLock({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<LockConfig | null>(null);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [wait, setWait] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const hiddenAt = useRef<number | null>(null);

  const lock = useCallback(() => {
    const c = loadLock();
    setCfg(c);
    if (!c) return;
    try { sessionStorage.removeItem(UNLOCKED); } catch { /* ignore */ }
    document.documentElement.setAttribute("data-lock", "1");
    setPin(""); setMsg(null);
    setLocked(true);
  }, []);

  const unlock = useCallback(() => {
    try { sessionStorage.setItem(UNLOCKED, "1"); } catch { /* ignore */ }
    document.documentElement.removeAttribute("data-lock");
    clearFails();
    setPin(""); setMsg(null);
    setLocked(false);
  }, []);

  // first load, and whenever settings change
  useEffect(() => {
    const init = () => {
      const c = loadLock();
      setCfg(c);
      if (!c) { document.documentElement.removeAttribute("data-lock"); setLocked(false); return; }
      let ok = false;
      try { ok = !!sessionStorage.getItem(UNLOCKED); } catch { /* ignore */ }
      if (ok) { document.documentElement.removeAttribute("data-lock"); setLocked(false); } else lock();
    };
    init();
    window.addEventListener("uo-lock-changed", init);
    window.addEventListener("uo-lock-now", lock);
    return () => { window.removeEventListener("uo-lock-changed", init); window.removeEventListener("uo-lock-now", lock); };
  }, [lock]);

  // lock again after the app has been in the background for a while
  useEffect(() => {
    const onVis = () => {
      const c = loadLock();
      if (!c) return;
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current >= c.timeoutMs) lock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [lock]);

  // cool-down countdown
  useEffect(() => {
    if (!locked) return;
    setWait(lockedOutFor());
    const id = setInterval(() => setWait(lockedOutFor()), 1000);
    return () => clearInterval(id);
  }, [locked]);

  const tryPin = useCallback(async (value: string) => {
    if (!cfg) return;
    if (await checkPin(cfg, value)) return unlock();
    const out = recordFail();
    setShake(true); setTimeout(() => setShake(false), 400);
    navigator.vibrate?.(120);
    setPin("");
    setMsg(out ? "Too many tries. Wait 30 seconds." : "That PIN isn't right.");
    setWait(lockedOutFor());
  }, [cfg, unlock]);

  const press = useCallback((k: string) => {
    if (!cfg || wait > 0) return;
    setMsg(null);
    if (k === "del") return setPin((p) => p.slice(0, -1));
    setPin((p) => {
      if (p.length >= cfg.len) return p;
      const next = p + k;
      if (next.length === cfg.len) setTimeout(() => tryPin(next), 0);
      return next;
    });
  }, [cfg, wait, tryPin]);

  // desktop keyboard
  useEffect(() => {
    if (!locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, press]);

  async function bio() {
    if (cfg?.cred && (await bioVerify(cfg.cred))) unlock();
    else setMsg("Fingerprint or Face ID didn't work. Use your PIN.");
  }

  async function forgot() {
    if (!confirm("Forgot your PIN? You'll be signed out and the lock on this device will be removed. You can sign back in with your email.")) return;
    try { localStorage.removeItem("uo-lock"); sessionStorage.clear(); } catch { /* ignore */ }
    document.documentElement.removeAttribute("data-lock");
    await signOut();
  }

  return (
    <>
      {children}
      {locked && cfg && (
        <div role="dialog" aria-modal="true" aria-label="App locked" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8" style={{ background: "linear-gradient(180deg, var(--bg-top), var(--bg))" }}>
          <Orbit size="5.5rem" />
          <h1 className="font-display text-2xl font-semibold">A Universe of Two</h1>
          <p className="text-sm text-[var(--ink-soft)]">Enter your PIN</p>

          <div className={`flex gap-3 ${shake ? "shake" : ""}`} role="status" aria-label={`${pin.length} of ${cfg.len} digits entered`}>
            {Array.from({ length: cfg.len }, (_, i) => (
              <span key={i} className="h-4 w-4 rounded-full border-2 border-[var(--accent-deep)]" style={{ background: i < pin.length ? "var(--accent-deep)" : "transparent" }} />
            ))}
          </div>
          <p className="min-h-5 text-sm" role="alert">{wait > 0 ? <span className="error">Try again in {wait}s</span> : msg ? <span className="error">{msg}</span> : null}</p>

          <div className="grid grid-cols-3 gap-3">
            {KEYS.map((k) => {
              if (k === "bio") {
                return cfg.cred
                  ? <button key={k} type="button" onClick={bio} aria-label="Use fingerprint or Face ID" className="h-16 w-16 rounded-full text-2xl" disabled={wait > 0}>🔓</button>
                  : <span key={k} />;
              }
              return (
                <button
                  key={k} type="button" onClick={() => press(k)} disabled={wait > 0}
                  aria-label={k === "del" ? "Delete last digit" : k}
                  className="h-16 w-16 touch-manipulation rounded-full border border-[var(--line)] bg-[var(--inset)] text-2xl font-semibold transition-transform active:scale-95 disabled:opacity-50"
                >
                  {k === "del" ? "⌫" : k}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={forgot} className="text-sm text-[var(--ink-soft)] underline underline-offset-4">Forgot PIN?</button>
        </div>
      )}
    </>
  );
}
