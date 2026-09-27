import { PageHeader } from "@/components/ui/page-header";
import { MemoryGame } from "@/features/games/memory-game";
import { createClient } from "@/lib/supabase/server";
import { signMedia } from "@/server/media";
import { newSeed, shuffle } from "@/utils/random";

export const metadata = { title: "Memory" };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("media").select("*").eq("kind", "image").eq("include_in_random", true).limit(200);
  const signed = await signMedia(supabase, shuffle(data ?? []).slice(0, 6));
  return (
    <div>
      <PageHeader title="Memory" subtitle="Trova le coppie." back="/viola/giochi" />
      <MemoryGame images={signed.map((m) => m.thumbUrl)} seed={newSeed()} />
    </div>
  );
}
