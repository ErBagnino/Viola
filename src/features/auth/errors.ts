import type { AuthError } from "@supabase/supabase-js";

/** Tell a wrong password apart from a misconfigured deploy, so setup problems are fixable. */
export function signInErrorMessage(error: Pick<AuthError, "code" | "status" | "message">) {
  const code = error.code ?? "";
  if (code === "invalid_credentials") return "Email o password non corrette. Riprova ♡";
  if (code === "email_not_confirmed")
    return "Questo account non è ancora confermato. In Supabase → Authentication → Users conferma l'utente (o ricrealo con \"Auto Confirm User\").";
  if (code.includes("rate_limit") || error.status === 429) return "Troppi tentativi di fila. Aspetta un minuto e riprova ♡";
  if (error.status === 401 || error.status === 403 || /api ?key/i.test(error.message))
    return "La chiave di Supabase non è valida: controlla NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY su Vercel (deve essere la chiave publishable o anon) e rifai il deploy.";
  if (code === "user_banned") return "Questo account è disattivato.";
  if (error.status && error.status >= 400 && error.status < 500 && error.status !== 404) return "Email o password non corrette. Riprova ♡";
  return "Non riesco a collegarmi a Supabase: controlla NEXT_PUBLIC_SUPABASE_URL su Vercel (deve essere https://xxxx.supabase.co), che il progetto Supabase non sia in pausa, poi rifai il deploy.";
}
