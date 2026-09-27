import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RandomPhoto } from "@/features/gallery/random-photo";
import { createViolaClient } from "@/server/viola-view";
import { signMedia } from "@/server/media";
import { toPhoto } from "@/server/noi-data";
import { getPhrases } from "@/server/viola-data";
import { getSettings } from "@/server/settings";
import { pickOne, shuffle } from "@/utils/random";

export const metadata = { title: "Fammi vedere noi" };

export default async function RandomPhotoPage({ searchParams }: PageProps<"/viola/noi/foto/random">) {
  const { chi } = await searchParams;
  const onlyAdam = chi === "adam";
  const supabase = await createViolaClient();
  const settings = await getSettings();

  let q = supabase.from("media").select("*").eq("kind", "image").eq("include_in_random", true);
  if (onlyAdam) q = q.or("category.eq.adam,ai_avatar_enabled.eq.true");
  let { data } = await q.limit(400);
  if (onlyAdam && !data?.length) ({ data } = await supabase.from("media").select("*").eq("kind", "image").eq("include_in_random", true).limit(400));

  const photos = (await signMedia(supabase, shuffle(data ?? []).slice(0, 40))).map(toPhoto);
  const phrases = (await getPhrases(onlyAdam ? "breathing" : "home")).map((p) => p.text);
  const adam = settings.general.adamName;

  return (
    <div>
      <PageHeader title={onlyAdam ? `Eccomi, sono ${adam}` : "Fammi vedere noi"} back="/viola/noi" />
      {photos.length ? (
        <RandomPhoto photos={photos} phrases={phrases} initialPhrase={pickOne(phrases) ?? ""} />
      ) : (
        <EmptyState title="Ancora nessuna foto" text={`${adam} non ha ancora caricato foto. Presto arriveranno ♡`} />
      )}
    </div>
  );
}
