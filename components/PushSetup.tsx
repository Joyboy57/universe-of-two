"use client";
import { useEffect, useState } from "react";
import { removeSubscription, saveSubscription, sendTestPush } from "@/app/(app)/settings/actions";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(b64: string) {
  const padded = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

type Status = "loading" | "no-key" | "ios-install" | "unsupported" | "denied" | "off" | "on";

export function PushSetup() {
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!KEY) return setStatus("no-key");
      const ua = navigator.userAgent;
      const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (isIOS && !standalone) return setStatus("ios-install");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setStatus("unsupported");

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        saveSubscription(sub.toJSON(), ua); // keeps this device linked to whoever is signed in now
        return setStatus("on");
      }
      setStatus(Notification.permission === "denied" ? "denied" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) as BufferSource });
      const r = await saveSubscription(sub.toJSON(), navigator.userAgent);
      if (r.error) { setMsg(r.error); return; }
      setStatus("on");
    } catch {
      setMsg("Couldn't turn notifications on. Try again.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await removeSubscription(sub.endpoint); await sub.unsubscribe(); }
      setStatus("off");
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setMsg(null);
    const r = await sendTestPush();
    setMsg(r.error ?? "Sent. It should arrive in a few seconds.");
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {status === "loading" && <p className="text-[var(--ink-soft)]">Checking this device…</p>}
      {status === "no-key" && <p className="error">Notifications aren&apos;t configured yet (missing VAPID key).</p>}
      {status === "unsupported" && <p className="text-[var(--ink-soft)]">This browser can&apos;t receive notifications. Try Chrome on Android, or Safari on iPhone after adding the app to your Home Screen.</p>}
      {status === "ios-install" && (
        <div className="space-y-2">
          <p className="font-semibold">On iPhone, install the app first</p>
          <ol className="list-decimal space-y-1 pl-5 text-[var(--ink-soft)]">
            <li>Open this site in <b>Safari</b>.</li>
            <li>Tap the Share button, then <b>Add to Home Screen</b>.</li>
            <li>Open the new app icon, sign in again, and return to this page.</li>
          </ol>
        </div>
      )}
      {status === "denied" && <p className="error">Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.</p>}
      {status === "off" && <button className="btn" disabled={busy} onClick={enable}>{busy ? "Turning on…" : "Turn on notifications here"}</button>}
      {status === "on" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn" disabled={busy} onClick={test}>Send me a test</button>
          <button className="btn btn-quiet" disabled={busy} onClick={disable}>Turn off on this device</button>
        </div>
      )}
      {status === "on" && <p className="text-sm text-[var(--ink-soft)]">Notifications are on for this device ♥</p>}
      {msg && <p role="status" className="text-sm text-[var(--ink-soft)]">{msg}</p>}
    </div>
  );
}
