import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GuessMemory, type GuessItem } from "@/features/games/guess-memory";
import { createViolaClient } from "@/server/viola-view";
import { mediaByIds, signMedia, photoSrc } from "@/server/media";
import { getSettings } from "@/server/settings";
import { shuffle } from "@/utils/random";

export const metadata = { title: "Indovina il ricordo" };

// Memories with a photo first; photos with a title from the gallery as a fallback.
export default async function GuessPage() {
  const supabase = await createViolaClient();
  const [{ data: memories }, { data: photos }, settings] = await Promise.all([
    supabase.from("memories").select("id, title, body, place, happened_on, media_id").not("media_id", "is", null).limit(60),
    supabase.from("media").select("*").eq("kind", "image").eq("include_in_random", true).not("title", "is", null).limit(60),
    getSettings(),
  ]);
  const memMedia = await mediaByIds(supabase, (memories ?? []).map((m) => m.media_id));
  const fromMemories: GuessItem[] = (memories ?? []).flatMap((m) => {
    const img = m.media_id ? memMedia.get(m.media_id) : null;
    return img ? [{ id: m.id, imageUrl: img.url, photo: photoSrc(img), question: m.place ? "Ti ricordi dov'eravamo?" : "Ti ricordi quando?", title: m.title, date: m.happened_on, place: m.place, text: m.body.slice(0, 280) }] : [];
  });
  const fromPhotos: GuessItem[] = fromMemories.length >= 3 ? [] : (await signMedia(supabase, shuffle(photos ?? []).slice(0, 20))).map((p) => ({ id: p.id, imageUrl: p.url, photo: photoSrc(p), question: "Ti ricordi questa foto?", title: p.title, date: p.takenOn, place: null, text: p.caption }));
  const items = shuffle([...fromMemories, ...fromPhotos]);
  return (
    <div>
      <PageHeader title="Indovina il ricordo" subtitle="Guarda bene. Poi svela." back="/viola/giochi" />
      {items.length ? (
        <GuessMemory items={items} />
      ) : (
        <EmptyState title="Ancora nessun ricordo da indovinare" text={`Quando ${settings.general.adamName} aggiungerà ricordi con una foto, li trovi qui ♡`} />
      )}
    </div>
  );
}
