import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { SettingsMap } from "@/features/settings/schema";

type MediaFlags = { id: string; kind: string; visibility: string; contexts: string[] | null; include_in_random: boolean; breathing_enabled: boolean; category: string | null; ai_avatar_enabled: boolean };

const q = (t: string) => (t.length > 40 ? `“${t.slice(0, 38)}…”` : `“${t}”`);

/**
 * "Usata in…": for every photo/audio, the places where Viola meets it —
 * content that points to it and app features that pick it (gallery, Memory…).
 * An empty list means the file is not used anywhere.
 */
export async function getMediaUsage(supabase: ServerSupabase, settings: SettingsMap, media: MediaFlags[]): Promise<Record<string, string[]>> {
  const [memories, dedications, openWhen, countdowns, surprises, capsules, comfort, breathing, audio, presets] = await Promise.all([
    supabase.from("memories").select("title, media_id").not("media_id", "is", null).limit(3000),
    supabase.from("dedications").select("title, media_id, audio_id").limit(3000),
    supabase.from("open_when_cards").select("title, media_id, audio_id").limit(1000),
    supabase.from("countdowns").select("title, media_id").not("media_id", "is", null).limit(500),
    supabase.from("daily_surprises").select("title, media_id").not("media_id", "is", null).limit(2000),
    supabase.from("time_capsules").select("title, media_id").not("media_id", "is", null).limit(500),
    supabase.from("comfort_actions").select("title, media_id, sound_id").limit(500),
    supabase.from("breathing_media").select("media_id").limit(1000),
    supabase.from("audio_items").select("title, media_id").limit(1000),
    supabase.from("breathing_presets").select("name, audio_id").not("audio_id", "is", null).limit(200),
  ]);
  const out: Record<string, string[]> = {};
  const add = (id: string | null | undefined, label: string) => {
    if (!id) return;
    const list = (out[id] ??= []);
    if (!list.includes(label)) list.push(label);
  };
  for (const r of memories.data ?? []) add(r.media_id, `Ricordo ${q(r.title)}`);
  for (const r of dedications.data ?? []) {
    add(r.media_id, `Dedica ${q(r.title)}`);
    add(r.audio_id, `Dedica ${q(r.title)}`);
  }
  for (const r of openWhen.data ?? []) {
    add(r.media_id, `Busta ${q(r.title)}`);
    add(r.audio_id, `Busta ${q(r.title)}`);
  }
  for (const r of countdowns.data ?? []) add(r.media_id, `Countdown ${q(r.title)}`);
  for (const r of surprises.data ?? []) add(r.media_id, `Sorpresa ${q(r.title)}`);
  for (const r of capsules.data ?? []) add(r.media_id, `Capsula ${q(r.title)}`);
  for (const r of comfort.data ?? []) {
    add(r.media_id, `Aiutami ${q(r.title)}`);
    add(r.sound_id, `Aiutami ${q(r.title)}`);
  }
  for (const r of breathing.data ?? []) add(r.media_id, "Respirazione");
  for (const r of audio.data ?? []) add(r.media_id, `La voce di Adam ${q(r.title)}`);
  for (const r of presets.data ?? []) add(r.audio_id, `Respiro ${q(r.name)}`);
  add(settings.ai_profile.avatarMediaId, "Avatar di Adam AI");

  for (const m of media) {
    if (m.kind !== "image") continue;
    const ctx = m.contexts ?? [];
    if (ctx.includes("gallery")) add(m.id, "Galleria");
    if (ctx.includes("home")) add(m.id, "Buongiorno");
    if (ctx.includes("surprises")) add(m.id, "Sorprendimi");
    if (m.include_in_random) add(m.id, "Memory · Puzzle · Foto a caso");
    if (m.breathing_enabled) add(m.id, "Respirazione");
    if (m.category === "adam" || m.ai_avatar_enabled) add(m.id, "Voglio vedere Adam");
  }
  return out;
}
