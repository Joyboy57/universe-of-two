import Link from "next/link";
import { BackupTool } from "@/components/BackupTool";

export default function BackupPage() {
  return (
    <main className="space-y-6">
      <Link href="/more" className="text-sm text-[var(--ink-soft)] underline underline-offset-4">← More</Link>
      <h1 className="font-display text-3xl font-semibold">Backup</h1>
      <BackupTool />
    </main>
  );
}
