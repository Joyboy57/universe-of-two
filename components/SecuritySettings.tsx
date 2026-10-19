"use client";
import { useEffect, useState } from "react";
import { UNLOCKED, bioAvailable, bioRegister, checkPin, loadLock, makeLock, saveLock, type LockConfig } from "@/lib/applock";

const TIMEOUTS: [string, number][] = [["Right away", 0], ["After 1 minute", 60_000], ["After 5 minutes", 300_000], ["After 15 minutes", 900_000]];
const changed = () => window.dispatchEvent(new Event("uo-lock-changed"));

export function SecuritySettings() {
  const [cfg, setCfg] = useState<LockConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [bio, setBio] = useState(false);
  const [len, setLen] = useState(4);
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [current, setCurrent] = useState("");
  const [timeout, setTimeoutMs] = useState(60_000);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = loadLock();
    setCfg(c);
    if (c) setTimeoutMs(c.timeoutMs);
    bioAvailable().then(setBio);
    setReady(true);
  }, []);

  const reset = () => { setPin1(""); setPin2(""); setCurrent(""); };

  async function turnOn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!new RegExp(`^\\d{${len}}$`).test(pin1)) return setMsg(`Use exactly ${len} digits.`);
    if (pin1 !== pin2) return setMsg("The two PINs don't match.");
    setBusy(true);
    const c = await makeLock(pin1, timeout);
    saveLock(c); setCfg(c);
    try { sessionStorage.setItem(UNLOCKED, "1"); } catch { /* ignore */ }
    reset(); setBusy(false); changed();
    setMsg("App lock is on for this device ♥");
  }

  async function needPin(): Promise<boolean> {
    if (!cfg) return false;
    if (!(await checkPin(cfg, current))) { setMsg("Your current PIN isn't right."); return false; }
    return true;
  }

  async function saveTimeout(ms: number) {
    setTimeoutMs(ms);
    if (cfg) { const c = { ...cfg, timeoutMs: ms }; saveLock(c); setCfg(c); }
  }

  async function turnOff() {
    setMsg(null); setBusy(true);
    if (await needPin()) { saveLock(null); setCfg(null); reset(); changed(); setMsg("App lock is off."); }
    setBusy(false);
  }

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setMsg(null);
    if (!new RegExp(`^\\d{${cfg.len}}$`).test(pin1)) return setMsg(`Use exactly ${cfg.len} digits.`);
    if (pin1 !== pin2) return setMsg("The two PINs don't match.");
    setBusy(true);
    if (await needPin()) {
      const c = await makeLock(pin1, cfg.timeoutMs, cfg.cred);
      saveLock(c); setCfg(c); reset(); setMsg("PIN changed.");
    }
    setBusy(false);
  }

  async function toggleBio() {
    if (!cfg) return;
    setMsg(null); setBusy(true);
    if (cfg.cred) {
      const c = { ...cfg, cred: undefined }; saveLock(c); setCfg(c); setMsg("Fingerprint / Face ID turned off.");
    } else {
      const cred = await bioRegister();
      if (cred) { const c = { ...cfg, cred }; saveLock(c); setCfg(c); setMsg("Fingerprint / Face ID is on. Your PIN still works too."); }
      else setMsg("That didn't work on this device. Your PIN still works.");
    }
    setBusy(false);
  }

  if (!ready) return <div className="card h-40 animate-pulse" aria-busy="true" />;

  const pinFields = (n: number) => (
    <>
      <div>
        <label htmlFor="pin1" className="label">{cfg ? "New PIN" : "Choose a PIN"}</label>
        <input id="pin1" type="password" inputMode="numeric" autoComplete="new-password" maxLength={n} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))} className="input tracking-[0.4em]" />
      </div>
      <div>
        <label htmlFor="pin2" className="label">Repeat the PIN</label>
        <input id="pin2" type="password" inputMode="numeric" autoComplete="new-password" maxLength={n} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} className="input tracking-[0.4em]" />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <p className="text-[var(--ink-soft)]">
        This locks the app on <b>this device only</b>, so someone who picks up your unlocked phone can't open your memories.
        Set it up on each phone or computer you use. It's a convenience lock, so keep your phone's own screen lock on too.
      </p>

      {!cfg ? (
        <form onSubmit={turnOn} className="card space-y-4">
          <fieldset>
            <legend className="label">PIN length</legend>
            <div className="flex gap-2">
              {[4, 6].map((n) => <button key={n} type="button" className="chip" aria-pressed={len === n} onClick={() => { setLen(n); reset(); }}>{n} digits</button>)}
            </div>
          </fieldset>
          {pinFields(len)}
          <div>
            <label htmlFor="to" className="label">Lock the app</label>
            <select id="to" className="input" value={timeout} onChange={(e) => setTimeoutMs(Number(e.target.value))}>
              {TIMEOUTS.map(([l, v]) => <option key={v} value={v}>{l} after I leave it</option>)}
            </select>
          </div>
          <button className="btn w-full" disabled={busy}>{busy ? "Turning on…" : "Turn on app lock"}</button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="card space-y-4">
            <p className="font-semibold">App lock is on <span aria-hidden="true">🔒</span></p>
            <div>
              <label htmlFor="to2" className="label">Lock the app</label>
              <select id="to2" className="input" value={timeout} onChange={(e) => saveTimeout(Number(e.target.value))}>
                {TIMEOUTS.map(([l, v]) => <option key={v} value={v}>{l} after I leave it</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn" onClick={() => window.dispatchEvent(new Event("uo-lock-now"))}>Lock now</button>
              {bio && <button type="button" className="btn btn-quiet" disabled={busy} onClick={toggleBio}>{cfg.cred ? "Turn off fingerprint / Face ID" : "Use fingerprint / Face ID"}</button>}
            </div>
          </div>

          <form onSubmit={changePin} className="card space-y-4">
            <p className="font-semibold">Change PIN or turn off</p>
            <div>
              <label htmlFor="cur" className="label">Current PIN</label>
              <input id="cur" type="password" inputMode="numeric" autoComplete="current-password" maxLength={cfg.len} value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))} className="input tracking-[0.4em]" />
            </div>
            {pinFields(cfg.len)}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="btn" disabled={busy}>Change PIN</button>
              <button type="button" className="btn btn-quiet" disabled={busy} onClick={turnOff}>Turn off app lock</button>
            </div>
          </form>
        </div>
      )}

      {msg && <p role="status" className="text-[var(--accent-deep)]">{msg}</p>}
    </div>
  );
}
