export default function Loading() {
  return (
    <main className="space-y-6 pt-2" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-48 animate-pulse rounded-full bg-[var(--line)]" />
      <div className="card h-64 animate-pulse" />
      <div className="card h-32 animate-pulse" />
    </main>
  );
}
