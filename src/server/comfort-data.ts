import "server-only";
import { createViolaClient } from "@/server/viola-view";
import { mediaByIds } from "@/server/media";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";
import { actionHref } from "@/features/actions/registry";
import type { ComfortItem } from "@/features/comfort/help-now";
import { FALLBACK_COMFORT } from "@/features/content/fallbacks";

export async function getComfortItems(): Promise<ComfortItem[]> {
  const supabase = await createViolaClient();
  const [{ data }, settings] = await Promise.all([supabase.from("comfort_actions").select("*"), getSettings()]);
  const contact = getContact(settings);
  // Nothing configured (or the database is unreachable): never an empty "help me" screen.
  if (!data?.length) return FALLBACK_COMFORT;
  const media = await mediaByIds(supabase, data.flatMap((c) => [c.media_id, c.sound_id]));
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    text: c.text,
    category: c.category,
    duration: c.duration_seconds,
    icon: c.icon,
    imageUrl: c.media_id ? (media.get(c.media_id)?.url ?? null) : null,
    soundUrl: c.sound_id ? (media.get(c.sound_id)?.url ?? null) : null,
    ctaLabel: c.cta_label,
    ctaHref: actionHref(c.cta_action, contact, c.cta_url),
    weight: c.weight,
  }));
}
