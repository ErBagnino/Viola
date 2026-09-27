import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { MemoryFact } from "./prompt";

/** Enabled AI memory (service role: includes facts hidden from Viola's UI). */
export async function loadAiMemory(fallback: ServerSupabase): Promise<MemoryFact[]> {
  const read = (client: ServerSupabase) => client.from("ai_memory").select("category, key, value").eq("enabled", true).order("category").limit(200);
  const admin = createAdminClient() as ServerSupabase | null;
  let { data, error } = admin ? await read(admin) : { data: null, error: null };
  // no key, or a key that does not work: at least what the session may read
  if (!admin || error || !data?.length) ({ data, error } = await read(fallback));
  if (error) console.error("[ai] memory read failed:", error.code ?? error.message);
  return (data ?? []).map((m) => ({ category: m.category, key: m.key, value: m.value }));
}
