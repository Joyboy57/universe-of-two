"use server";
import { supabaseServer } from "@/lib/supabase/server";

export async function requestCode(email: string): Promise<{ error?: string }> {
  const e = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) return { error: "Enter a valid email address." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email: e,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return {
      error: /rate|seconds/i.test(error.message)
        ? "Too many tries. Wait a minute, then try again."
        : "We couldn't send a code to that address.",
    };
  }
  return {};
}

export async function verifyCode(email: string, token: string): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.replace(/\s/g, ""),
    type: "email",
  });
  if (error) return { error: "That code didn't work. Check it, or send a new one." };
  return {};
}
