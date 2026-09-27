import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { MemoryFact } from "./prompt";

/** Enabled AI memory (service role: includes facts hidden from Viola's UI). */
export async function loadAiMemory(fallback: ServerSupabase): Promise<MemoryFact[]> {
  const admin = createAdminClient();
  const client = admin ?? fallback;
  const { data } = await client.from("ai_memory").select("category, key, value").eq("enabled", true).order("category").limit(200);
  return (data ?? []).map((m) => ({ category: m.category, key: m.key, value: m.value }));
}
