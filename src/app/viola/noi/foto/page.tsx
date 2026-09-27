import Link from "next/link";
import { Shuffle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Gallery } from "@/features/gallery/gallery";
import { getGalleryPhotos } from "@/server/noi-data";

export const metadata = { title: "Le nostre foto" };

export default async function FotoPage() {
  const photos = await getGalleryPhotos();
  const categories = Array.from(new Set(photos.map((p) => p.category).filter(Boolean) as string[]));
  return (
    <div>
      <PageHeader
        title="Le nostre foto"
        subtitle={`${photos.length} momenti`}
        back="/viola/noi"
        right={
          photos.length > 0 ? (
            <Link href="/viola/noi/foto/random" className="press paper grid size-11 place-items-center rounded-2xl text-vio-700" aria-label="Una foto a caso">
              <Shuffle className="size-5" />
            </Link>
          ) : null
        }
      />
      {photos.length ? (
        <Gallery photos={photos} categories={categories} />
      ) : (
        <EmptyState title="Il nostro album è ancora vuoto." text="Ma qualcosa mi dice che non resterà così per molto. ♡" />
      )}
    </div>
  );
}
