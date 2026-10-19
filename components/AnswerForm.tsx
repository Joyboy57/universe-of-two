"use client";
import { useActionState, useEffect, useState } from "react";
import { saveAnswer } from "@/app/(app)/today/actions";
import type { FormState } from "@/lib/types";

type Props = { day: string; initial?: string; partnerName: string; partnerAnswered: boolean };

export function AnswerForm({ day, initial, partnerName, partnerAnswered }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAnswer, {});
  const [editing, setEditing] = useState(!initial);

  useEffect(() => { if (state.ok) setEditing(false); }, [state]);

  if (initial && !editing) {
    return (
      <div className="space-y-3">
        <p className="whitespace-pre-wrap rounded-2xl bg-[var(--bg)] p-4">{initial}</p>
        <p className="text-sm text-[var(--ink-soft)]">Waiting for {partnerName}'s answer. You can still change yours until they reply.</p>
        <button type="button" className="btn btn-quiet" onClick={() => setEditing(true)}>Change my answer</button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="day" value={day} />
      <label htmlFor="answer" className="label">Your answer</label>
      <textarea id="answer" name="body" required maxLength={1000} rows={4} defaultValue={initial ?? ""} className="input !min-h-28" />
      <p className="text-sm text-[var(--ink-soft)]">
        {partnerAnswered ? `${partnerName} has already answered ♥ You'll see it as soon as you send yours.` : `${partnerName} won't see it until they've answered too.`}
      </p>
      {state.error && <p role="alert" className="error">{state.error}</p>}
      <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Sending…" : initial ? "Save changes" : "Send my answer"}</button>
    </form>
  );
}
