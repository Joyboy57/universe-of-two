"use client";
import { useActionState, useState } from "react";
import { createList } from "@/app/(app)/lists/actions";
import { KINDS } from "@/lib/lists";
import type { FormState } from "@/lib/types";

export function NewListForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createList, {});
  const [kind, setKind] = useState<string>("custom");
  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div>
        <label htmlFor="list-title" className="label">List name</label>
        <input id="list-title" name="title" required maxLength={80} className="input" placeholder="Books to read together" />
      </div>
      <fieldset>
        <legend className="label">Type</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k.key} type="button" className="chip" aria-pressed={kind === k.key} onClick={() => setKind(k.key)}>
              <span aria-hidden="true">{k.icon}</span> {k.label}
            </button>
          ))}
        </div>
      </fieldset>
      {state.error && <p role="alert" className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Creating…" : "Create list"}</button>
    </form>
  );
}
