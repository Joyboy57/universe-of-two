"use client";
import { useState } from "react";

export function ShareInvite({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <button type="button" className="btn" onClick={share}>
      {copied ? "Copied" : "Share invite"}
    </button>
  );
}
