import { redirect } from "next/navigation";
import { getSpace } from "@/lib/session";
import { Orbit } from "@/components/Orbit";
import { PairForms } from "./pair-forms";

export default async function PairPage() {
  const { me } = await getSpace();
  if (me) redirect("/");

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <Orbit size="9rem" single />
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Make it yours</h1>
        <p className="text-[var(--ink-soft)]">
          One of you starts the space and shares the code. The other joins with it. Then it locks to the two of you.
        </p>
      </div>
      <PairForms />
    </main>
  );
}
