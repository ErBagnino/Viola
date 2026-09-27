import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { SettingsMap } from "@/features/settings/schema";
import { todayKey } from "@/utils/dates";

export type LimitResult = { ok: true } | { ok: false; reason: "daily" | "minute" | "tokens" };

/** Free-tier guard rails: daily messages, per-minute rate and token budget. */
export async function checkAiLimits(supabase: ServerSupabase, userId: string, scope: "viola" | "copilot", settings: SettingsMap): Promise<LimitResult> {
  const { ai, general } = settings;
  const [{ data: usage }, { count }] = await Promise.all([
    supabase.from("ai_usage_daily").select("*").eq("user_id", userId).eq("scope", scope).eq("day", todayKey(general.timezone)).maybeSingle(),
    supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", new Date(Date.now() - 60_000).toISOString()),
  ]);
  const dailyLimit = scope === "viola" ? ai.dailyMessageLimit : ai.copilotDailyLimit;
  if ((usage?.requests ?? 0) >= dailyLimit) return { ok: false, reason: "daily" };
  if ((usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0) >= ai.dailyTokenBudget) return { ok: false, reason: "tokens" };
  if ((count ?? 0) >= ai.perMinuteLimit) return { ok: false, reason: "minute" };
  return { ok: true };
}

export async function recordAiUsage(supabase: ServerSupabase, scope: "viola" | "copilot", requests: number, input: number, output: number) {
  await supabase.rpc("increment_ai_usage", {
    p_scope: scope,
    p_requests: Math.min(20, Math.max(0, requests)),
    p_input_tokens: Math.min(2_000_000, Math.max(0, Math.round(input))),
    p_output_tokens: Math.min(200_000, Math.max(0, Math.round(output))),
  });
}
