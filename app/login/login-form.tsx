"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestCode, verifyCode } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await requestCode(email);
      if (r.error) setError(r.error);
      else setStep("code");
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await verifyCode(email, code);
      if (r.error) setError(r.error);
      else {
        router.replace("/");
        router.refresh();
      }
    });
  }

  if (step === "email") {
    return (
      <form onSubmit={send} className="card w-full space-y-4 text-left">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email" type="email" inputMode="email" autoComplete="email" required
            className="input" value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="btn w-full" disabled={pending}>
          {pending ? "Sending…" : "Send me a code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="card w-full space-y-4 text-left">
      <p className="text-[var(--ink-soft)]">We sent a code to {email}. It usually arrives within a minute.</p>
      <div>
        <label htmlFor="code" className="label">Code</label>
        <input
          id="code" inputMode="numeric" autoComplete="one-time-code" required
          pattern="[0-9 ]{6,10}" maxLength={11}
          className="input text-center text-xl tracking-[0.3em]"
          value={code} onChange={(e) => setCode(e.target.value)}
        />
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <button className="btn w-full" disabled={pending}>
        {pending ? "Checking…" : "Enter our universe"}
      </button>
      <button
        type="button" className="btn btn-quiet w-full" disabled={pending}
        onClick={() => { setStep("email"); setCode(""); setError(null); }}
      >
        Use a different email
      </button>
    </form>
  );
}
