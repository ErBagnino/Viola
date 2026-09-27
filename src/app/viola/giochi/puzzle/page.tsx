import { PageHeader } from "@/components/ui/page-header";
import { Puzzle } from "@/features/games/puzzle";
import { createClient } from "@/lib/supabase/server";
import { signOne } from "@/server/media";
import { newSeed, pickOne } from "@/utils/random";

export const metadata = { title: "Puzzle" };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("media").select("*").eq("kind", "image").eq("include_in_random", true).limit(200);
  const photo = await signOne(supabase, pickOne(data ?? []));
  return (
    <div>
      <PageHeader title="Puzzle" subtitle="Rimetti insieme la foto." back="/viola/giochi" />
      <Puzzle imageUrl={photo?.url ?? null} seed={newSeed()} />
    </div>
  );
}
