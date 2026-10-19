import Link from "next/link";
import { SecuritySettings } from "@/components/SecuritySettings";

export default function SecurityPage() {
  return (
    <main className="space-y-6">
      <Link href="/more" className="text-sm text-[var(--ink-soft)] underline underline-offset-4">← More</Link>
      <h1 className="font-display text-3xl font-semibold">App lock</h1>
      <SecuritySettings />
    </main>
  );
}
