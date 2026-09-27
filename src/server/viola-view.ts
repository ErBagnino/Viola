import "server-only";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import { todayKey } from "@/utils/dates";

type Filterable = { eq(column: string, value: unknown): Filterable; lte(column: string, value: unknown): Filterable; or(filters: string): Filterable };
type Ctx = { now: string; today: string; userId: string };

/**
 * What Viola may read, table by table — the same rules as the RLS policies
 * in supabase/migrations/20260927000002_rls.sql (kept in sync by tests).
 * Tables of personal rows show only the viewer's own rows.
 */
export const VIOLA_READ_RULES: Record<string, (q: Filterable, c: Ctx) => Filterable> = {
  media: (q) => q.eq("visibility", "shared"),
  dedications: (q, c) => q.eq("is_published", true).or(`publish_at.is.null,publish_at.lte.${c.now}`),
  memories: (q) => q.eq("is_published", true),
  comfort_actions: (q) => q.eq("is_active", true),
  breathing_presets: (q) => q.eq("is_active", true),
  breathing_media: (q) => q.eq("is_active", true),
  grounding_exercises: (q) => q.eq("is_active", true),
  countdowns: (q) => q.eq("is_published", true),
  time_capsules: (q, c) => q.eq("is_published", true).lte("unlock_at", c.now),
  open_when_cards: (q) => q.eq("is_published", true),
  daily_surprises: (q, c) => q.eq("is_published", true).or(`scheduled_on.is.null,scheduled_on.lte.${c.today}`),
  home_modules: (q) => q.eq("is_enabled", true),
  phrases: (q) => q.eq("is_active", true),
  quiz_questions: (q) => q.eq("is_active", true),
  audio_items: (q) => q.eq("is_published", true),
  ai_memory: (q) => q.eq("enabled", true).eq("visible_to_viola", true),
  app_settings: (q) => q.eq("is_public", true),
  // her own rows only (Adam would otherwise see hers here)
  messages: (q, c) => q.eq("sender_id", c.userId),
  mood_entries: (q, c) => q.eq("user_id", c.userId),
  journal_entries: (q, c) => q.eq("user_id", c.userId),
  adam_requests: (q, c) => q.eq("user_id", c.userId),
  activity_events: (q, c) => q.eq("user_id", c.userId),
};

const bindAll = <T extends object>(target: T, prop: string | symbol) => {
  const v = Reflect.get(target, prop, target) as unknown;
  return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(target) : v;
};

/**
 * "Vedi come Viola": wraps Adam's client so every read of a content table
 * returns only what Viola would see (published, shared, active…). Writes are
 * untouched (and Viola's own write actions refuse to run in preview).
 */
export function violaView(client: ServerSupabase, userId: string, now = new Date()): ServerSupabase {
  const ctx: Ctx = { now: now.toISOString(), today: todayKey("Europe/Rome", now), userId };
  return new Proxy(client, {
    get(target, prop) {
      if (prop !== "from") return bindAll(target, prop);
      return (table: string) => {
        const builder = target.from(table as never) as object;
        const rule = VIOLA_READ_RULES[table];
        if (!rule) return builder;
        return new Proxy(builder, {
          get(b, p) {
            if (p !== "select") return bindAll(b, p);
            return (...args: unknown[]) => rule((b as { select: (...a: unknown[]) => Filterable }).select(...args), ctx);
          },
        });
      };
    },
  });
}

/** The Supabase client for Viola's screens: Adam in preview sees exactly her view. */
export async function createViolaClient(): Promise<ServerSupabase> {
  const [client, viewer] = await Promise.all([createClient(), getViewer()]);
  return viewer?.role === "admin" ? violaView(client, viewer.id) : client;
}
