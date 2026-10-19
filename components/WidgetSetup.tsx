"use client";
import { useState } from "react";
import { createWidgetLink, revokeWidgetLink } from "@/app/(app)/settings/widget/actions";

function scriptFor(url: string, site: string) {
  return `// Universe: today's photo swap
const BASE = "${url}";
const family = config.widgetFamily || "small";
const size = family === "small" ? "small" : family === "large" ? "large" : "medium";
const img = await new Request(BASE + "&size=" + size).loadImage();
const w = new ListWidget();
w.backgroundImage = img;
w.url = "${site}/today";
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
if (config.runsInWidget) { Script.setWidget(w); } else { await w.presentMedium(); }
Script.complete();`;
}

export function WidgetSetup({ hasLink }: { hasLink: boolean }) {
  const [made, setMade] = useState<{ url: string; site: string } | null>(null);
  const [exists, setExists] = useState(hasLink);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function make() {
    if (exists && !confirm("This replaces your old link. A widget using the old link will stop working until you update it. Continue?")) return;
    setBusy(true); setMsg(null);
    const r = await createWidgetLink();
    setBusy(false);
    if (r.error || !r.url || !r.site) return setMsg(r.error ?? "Something went wrong.");
    setMade({ url: r.url, site: r.site });
    setExists(true);
  }

  async function off() {
    if (!confirm("Turn off the widget link? Any widget using it will stop showing photos.")) return;
    setBusy(true);
    const r = await revokeWidgetLink();
    setBusy(false);
    if (r.error) return setMsg(r.error);
    setMade(null); setExists(false); setMsg("Widget link turned off.");
  }

  async function copy(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(null), 2000); } catch { setMsg("Couldn't copy. Select the text and copy it by hand."); }
  }

  const local = made && /localhost|127\.0\.0\.1/.test(made.site);

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <p className="font-semibold">How it works</p>
        <p className="text-[var(--ink-soft)]">
          A real widget on your home screen needs a small helper app. This makes a private picture link that
          shows <b>your person's photo of the day with yours as a small inset</b>, and a widget app displays it.
          Their photo appears only after you've shared yours.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn" disabled={busy} onClick={make}>{busy ? "Working…" : exists ? "Make a new link" : "Create my widget link"}</button>
          {exists && <button className="btn btn-quiet" disabled={busy} onClick={off}>Turn off the link</button>}
        </div>
        {exists && !made && <p className="text-sm text-[var(--ink-soft)]">You already have a link. For safety it can't be shown again, so make a new one if you need it.</p>}
      </div>

      {made && (
        <div className="space-y-6">
          {local && <p role="alert" className="error">This link points to your own computer (localhost), so your phone can't reach it. Create it from your live Vercel site instead.</p>}

          <div className="card space-y-3">
            <p className="font-semibold">Your private link</p>
            <p className="break-all rounded-2xl bg-[var(--inset)] p-3 text-sm">{made.url}</p>
            <button className="btn btn-quiet" onClick={() => copy("link", made.url)}>{copied === "link" ? "Copied" : "Copy link"}</button>
            <p className="text-sm text-[var(--ink-soft)]">Anyone with this link can see your photo swap, so don't share it. You can turn it off any time.</p>
          </div>

          <div className="card space-y-3">
            <p className="font-semibold">iPhone: with the free Scriptable app</p>
            <ol className="list-decimal space-y-1 pl-5 text-[var(--ink-soft)]">
              <li>Install <b>Scriptable</b> from the App Store.</li>
              <li>Open it, tap <b>+</b>, and paste the script below. Name it "Universe".</li>
              <li>On the Home Screen: long-press, tap <b>+</b>, choose <b>Scriptable</b>, pick a size, then <b>Add Widget</b>.</li>
              <li>Tap the new widget, choose <b>Script: Universe</b>, then tap outside to finish.</li>
            </ol>
            <pre className="max-h-64 overflow-auto rounded-2xl bg-[var(--inset)] p-3 text-xs">{scriptFor(made.url, made.site)}</pre>
            <button className="btn btn-quiet" onClick={() => copy("script", scriptFor(made.url, made.site))}>{copied === "script" ? "Copied" : "Copy script"}</button>
            <p className="text-xs text-[var(--ink-soft)]">iPhone decides how often a widget refreshes (about every 15 minutes or more), so new photos may take a little while to show.</p>
          </div>

          <div className="card space-y-2">
            <p className="font-semibold">Android</p>
            <p className="text-[var(--ink-soft)]">
              Use any widget app that can show a picture from a web address, and give it your link. Add
              <code className="mx-1 rounded bg-[var(--inset)] px-1">&amp;size=medium</code> or <code className="mx-1 rounded bg-[var(--inset)] px-1">&amp;size=large</code>
              to the end for a wider or bigger picture. I couldn't check the exact steps for specific Android widget apps, so tell me which one you use.
            </p>
          </div>
        </div>
      )}
      {msg && <p role="status" className="text-[var(--accent-deep)]">{msg}</p>}
    </div>
  );
}
