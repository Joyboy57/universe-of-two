import { Orbit } from "@/components/Orbit";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <Orbit size="9rem" />
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight">A Universe of Two</h1>
        <p className="font-hand text-2xl text-[var(--ink-soft)]">just for us</p>
      </div>
      <LoginForm />
    </main>
  );
}
