// Public (browser-safe) configuration. Only NEXT_PUBLIC_* values live here.
// Values are trimmed because keys pasted into a hosting dashboard often carry stray spaces/newlines.

/** Supabase wants the bare project URL; tolerate a pasted Data API URL such as `https://x.supabase.co/rest/v1/`. */
export function normalizeSupabaseUrl(raw: string | undefined) {
  const value = (raw ?? "").trim();
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

export const publicEnv = {
  supabaseUrl: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  vapidPublicKey: (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim(),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim(),
};

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey);
}
