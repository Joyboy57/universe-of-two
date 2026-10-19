import { redirect } from "next/navigation";
import { getSpace } from "@/lib/session";
import { BottomNav } from "@/components/BottomNav";
import { RegisterSW } from "@/components/RegisterSW";
import { AddFab } from "@/components/AddFab";
import { AppLock } from "@/components/AppLock";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = await getSpace();
  if (!me) redirect("/pair");

  return (
    <AppLock>
    <div data-app-root className="mx-auto min-h-[100dvh] max-w-3xl px-5 pb-28">
      <header className="glass mb-4 mt-3 flex items-center justify-between rounded-full py-1.5 pl-5 pr-1.5">
        <span className="font-display text-lg font-semibold">A Universe of Two</span>
        <form action={signOut}>
          <button className="btn btn-quiet !min-h-10 !px-4 text-sm">Sign out</button>
        </form>
      </header>
      {children}
      <RegisterSW />
      <AddFab />
      <BottomNav />
    </div>
    </AppLock>
  );
}
