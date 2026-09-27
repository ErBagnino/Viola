"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { homeFor, type Role } from "@/server/auth";
import { signInErrorMessage } from "./errors";

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  password: z.string().min(6).max(200),
});

export type SignInState = { error?: string } | undefined;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  if (!isSupabaseConfigured()) return { error: "L'app non è ancora configurata (vedi SETUP.md)." };
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Controlla email e password ♡" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    // Visible in the hosting logs; never includes the password or keys.
    console.error("[auth] sign-in failed", { status: error?.status, code: error?.code, name: error?.name, message: error?.message });
    return { error: error ? signInErrorMessage(error) : "Email o password non corrette. Riprova ♡" };
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profileError) {
    console.error("[auth] profile lookup failed", { code: profileError.code, message: profileError.message });
    await supabase.auth.signOut();
    return { error: "Il database non è pronto: in Supabase → SQL Editor esegui il file supabase/setup.sql (SETUP.md, passo 4)." };
  }
  redirect(homeFor((profile?.role ?? "pending") as Role));
}
