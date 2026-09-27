import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaByIds, signMedia } from "@/server/media";
import { getPhrases } from "@/server/viola-data";
import { DEFAULT_PATTERN } from "@/features/breathing/cycle";
import type { BreathingPhoto, BreathingPresetView, BreathingVisual } from "@/features/breathing/types";
import { shuffle } from "@/utils/random";

const VISUALS = new Set(["heart", "sphere", "flower", "orb", "star", "wave"]);

export const FALLBACK_PRESET: BreathingPresetView = {
  id: "default",
  name: "Respiro calmo",
  description: "Inspira 4, trattieni 4, espira 6.",
  inhale: DEFAULT_PATTERN.inhale,
  hold: DEFAULT_PATTERN.hold,
  exhale: DEFAULT_PATTERN.exhale,
  holdAfter: 0,
  rounds: DEFAULT_PATTERN.rounds,
  visual: "heart",
  showPhotos: true,
  photoMode: "blur_to_clear",
  texts: ["Respira con me.", "Eccomi.", "Un respiro alla volta."],
  audioUrl: null,
};

/** Presets (default first), photos for breathing and phrases. */
export async function getBreathingData() {
  const supabase = await createClient();
  const [{ data: presets }, { data: links }, { data: pool }, phrases] = await Promise.all([
    supabase.from("breathing_presets").select("*").order("is_default", { ascending: false }).order("position"),
    supabase.from("breathing_media").select("*").order("position"),
    supabase.from("media").select("*").eq("kind", "image").eq("breathing_enabled", true).limit(60),
    getPhrases("breathing"),
  ]);

  const audioIds = (presets ?? []).map((p) => p.audio_id);
  const linkIds = (links ?? []).map((l) => l.media_id);
  const media = await mediaByIds(supabase, [...audioIds, ...linkIds]);

  const views: BreathingPresetView[] = (presets ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    inhale: Number(p.inhale_seconds),
    hold: Number(p.hold_seconds),
    exhale: Number(p.exhale_seconds),
    holdAfter: Number(p.hold_after_exhale_seconds),
    rounds: p.rounds,
    visual: (VISUALS.has(p.visual) ? p.visual : "heart") as BreathingVisual,
    showPhotos: p.show_photos,
    photoMode: p.photo_mode as BreathingPresetView["photoMode"],
    texts: p.texts ?? [],
    audioUrl: p.audio_id ? (media.get(p.audio_id)?.url ?? null) : null,
  }));

  const linked: BreathingPhoto[] = (links ?? [])
    .map((l) => ({ url: l.media_id ? media.get(l.media_id)?.url : undefined, text: l.text }))
    .filter((x): x is BreathingPhoto => Boolean(x.url));
  const signedPool = await signMedia(supabase, shuffle(pool ?? []).slice(0, 12));
  const photos = [...linked, ...signedPool.map((m) => ({ url: m.url, text: null }))];

  return {
    presets: views.length ? views : [FALLBACK_PRESET],
    photos,
    phrases: phrases.map((p) => p.text),
  };
}
