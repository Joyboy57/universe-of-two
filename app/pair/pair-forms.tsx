"use client";
import { useActionState, useEffect, useState } from "react";
import { createSpace, joinSpace } from "./actions";
import type { PairState } from "@/lib/types";

export function PairForms() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [tz, setTz] = useState("UTC");
  const [createState, createAction, creating] = useActionState<PairState, FormData>(createSpace, {});
  const [joinState, joinAction, joining] = useActionState<PairState, FormData>(joinSpace, {});

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  return (
    <div className="w-full space-y-5">
      <div role="tablist" className="grid grid-cols-2 gap-2">
        <button role="tab" aria-selected={mode === "create"} type="button"
          className={`btn ${mode === "create" ? "" : "btn-quiet"}`} onClick={() => setMode("create")}>
          Start our space
        </button>
        <button role="tab" aria-selected={mode === "join"} type="button"
          className={`btn ${mode === "join" ? "" : "btn-quiet"}`} onClick={() => setMode("join")}>
          I have a code
        </button>
      </div>

      {mode === "create" ? (
        <form action={createAction} className="card space-y-4 text-left">
          <input type="hidden" name="tz" value={tz} />
          <div>
            <label htmlFor="displayName" className="label">What should your person call you?</label>
            <input id="displayName" name="displayName" required maxLength={40} className="input" />
          </div>
          <div>
            <label htmlFor="startDate" className="label">Together since (optional)</label>
            <input id="startDate" name="startDate" type="date" className="input" />
          </div>
          {createState.error && <p role="alert" className="error">{createState.error}</p>}
          <button className="btn w-full" disabled={creating}>
            {creating ? "Creating…" : "Create our space"}
          </button>
          <p className="text-sm text-[var(--ink-soft)]">You'll get a code to send to your person.</p>
        </form>
      ) : (
        <form action={joinAction} className="card space-y-4 text-left">
          <input type="hidden" name="tz" value={tz} />
          <div>
            <label htmlFor="code" className="label">Invite code</label>
            <input id="code" name="code" required maxLength={8} autoCapitalize="characters"
              autoComplete="off" className="input text-center text-xl uppercase tracking-[0.3em]" />
          </div>
          <div>
            <label htmlFor="displayName2" className="label">What should your person call you?</label>
            <input id="displayName2" name="displayName" required maxLength={40} className="input" />
          </div>
          {joinState.error && <p role="alert" className="error">{joinState.error}</p>}
          <button className="btn w-full" disabled={joining}>
            {joining ? "Joining…" : "Join our space"}
          </button>
        </form>
      )}
    </div>
  );
}
