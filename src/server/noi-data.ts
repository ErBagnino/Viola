import "server-only";
import { createViolaClient } from "@/server/viola-view";
import { mediaByIds, signMedia, photoSrc } from "@/server/media";
import type { DedicationView } from "@/features/dedications/dedications-list";
import type { GalleryPhoto } from "@/features/gallery/gallery";
import type { MediaView } from "@/server/media";

export function toPhoto(m: MediaView): GalleryPhoto {
  return {
    id: m.id,
    url: m.url,
    thumbUrl: m.thumbUrl,
    width: m.width,
    height: m.height,
    title: m.title,
    caption: m.caption,
    takenOn: m.takenOn,
    category: m.category,
    featured: m.featured,
    place: m.place,
    focus: m.focus,
  };
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const supabase = await createViolaClient();
  const { data } = await supabase
    .from("media")
    .select("*")
    .eq("kind", "image")
    .contains("contexts", ["gallery"])
    .order("featured", { ascending: false })
    .order("taken_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  return (await signMedia(supabase, data ?? [])).map(toPhoto);
}

export async function getDedications(signature: string): Promise<DedicationView[]> {
  const supabase = await createViolaClient();
  const { data } = await supabase.from("dedications").select("*").order("pinned", { ascending: false }).order("position");
  const media = await mediaByIds(supabase, (data ?? []).flatMap((d) => [d.media_id, d.audio_id]));
  return (data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    body: d.body,
    category: d.category,
    imageUrl: d.media_id ? (media.get(d.media_id)?.url ?? null) : null,
    photo: d.media_id ? photoSrc(media.get(d.media_id)) : null,
    audioUrl: d.audio_id ? (media.get(d.audio_id)?.url ?? null) : null,
    signature: d.signature || signature,
    pinned: d.pinned,
  }));
}

export async function getMemories() {
  const supabase = await createViolaClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .order("happened_on", { ascending: false, nullsFirst: false })
    .order("position");
  const media = await mediaByIds(supabase, (data ?? []).map((m) => m.media_id));
  return (data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    body: m.body,
    kind: m.kind,
    happenedOn: m.happened_on,
    place: m.place,
    imageUrl: m.media_id ? (media.get(m.media_id)?.url ?? null) : null,
    photo: m.media_id ? photoSrc(media.get(m.media_id)) : null,
    important: m.is_important,
  }));
}
export type MemoryView = Awaited<ReturnType<typeof getMemories>>[number];
