import { DateForm } from "@/components/DateForm";
import { isValidKey } from "@/lib/dates";

export default async function NewDatePage({ searchParams }: { searchParams: Promise<{ date?: string; inperson?: string }> }) {
  const { date, inperson } = await searchParams;
  return (
    <main className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">A new date</h1>
      <DateForm initial={{ date: date && isValidKey(date) ? date : undefined, in_person: inperson === "1" }} cancelHref="/calendar" />
    </main>
  );
}
