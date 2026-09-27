import "server-only";
import { cache } from "react";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import { signOne, type MediaView } from "@/server/media";
import { todayKey } from "@/utils/dates";
import { seededRandom, weightedPick } from "@/utils/random";
import type { Tables } from "@/db/database.types";

export type Phrase = Tables<"phrases">;

export const getPhrases = cache(async (kind: string): Promise<Phrase[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("phrases").select("*").eq("kind", kind).eq("is_active", true);
  return data ?? [];
});

export async function randomPhrase(kind: string, fallback = ""): Promise<string> {
  const list = await getPhrases(kind);
  return weightedPick(list)?.text ?? fallback;
}

/** Same phrase all day long (e.g. good morning), changes the next day. */
export async function phraseOfTheDay(kind: string, tz: string, fallback = ""): Promise<string> {
  const list = await getPhrases(kind);
  return weightedPick(list, seededRandom(`${kind}:${todayKey(tz)}`))?.text ?? fallback;
}

export type DailySurprise = Tables<"daily_surprises"> & { media: MediaView | null };

/** Today's surprise: a surprise scheduled for today wins, otherwise a stable daily pick. */
export async function getDailySurprise(tz: string): Promise<DailySurprise | null> {
  const supabase = await createClient();
  const today = todayKey(tz);
  const { data } = await supabase.from("daily_surprises").select("*").order("created_at");
  const all = data ?? [];
  const scheduled = all.filter((s) => s.scheduled_on === today);
  const pool = scheduled.length ? scheduled : all.filter((s) => !s.scheduled_on);
  const pick = weightedPick(pool, seededRandom(`surprise:${today}`));
  if (!pick) return null;
  return { ...pick, media: await mediaFor(supabase, pick.media_id) };
}

export async function mediaFor(supabase: ServerSupabase, id: string | null | undefined) {
  if (!id) return null;
  const { data } = await supabase.from("media").select("*").eq("id", id).maybeSingle();
  return signOne(supabase, data);
}

export async function getNextCountdown(): Promise<Tables<"countdowns"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("countdowns")
    .select("*")
    .eq("show_on_home", true)
    .order("target_at", { ascending: true });
  const now = Date.now();
  const upcoming = (data ?? []).filter((c) => c.recurring_yearly || new Date(c.target_at).getTime() > now);
  return upcoming[0] ?? null;
}

/** Media the app may use for a given purpose (random photos, breathing, …). */
export async function mediaPool(opts: { context?: string; breathing?: boolean; random?: boolean; category?: string; limit?: number } = {}) {
  const supabase = await createClient();
  let q = supabase.from("media").select("*").eq("kind", "image");
  if (opts.context) q = q.contains("contexts", [opts.context]);
  if (opts.breathing) q = q.eq("breathing_enabled", true);
  if (opts.random) q = q.eq("include_in_random", true);
  if (opts.category) q = q.eq("category", opts.category);
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 300);
  return data ?? [];
}
