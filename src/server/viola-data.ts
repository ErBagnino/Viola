import "server-only";
import { cache } from "react";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import { signOne, type MediaView } from "@/server/media";
import { todayKey, occurrenceOf } from "@/utils/dates";
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

export async function getNextCountdown(tz: string): Promise<(Tables<"countdowns"> & { isToday: boolean }) | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("countdowns").select("*").eq("show_on_home", true);
  const now = new Date();
  // Rank by the NEXT occurrence (a yearly birthday stored in 1998 is not "first"),
  // and keep the whole day of the date: "È oggi" is the best moment to show it.
  const ranked = (data ?? [])
    .map((c) => ({ c, occ: occurrenceOf(c.target_at, c.recurring_yearly, now, tz) }))
    .filter((x) => !x.occ.past)
    .sort((a, b) => Number(b.occ.isToday) - Number(a.occ.isToday) || a.occ.at.getTime() - b.occ.at.getTime());
  const first = ranked[0];
  return first ? { ...first.c, isToday: first.occ.isToday } : null;
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
