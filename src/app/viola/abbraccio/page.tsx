import { Hug } from "@/features/hug/hug";
import { createClient } from "@/lib/supabase/server";
import { signOne } from "@/server/media";
import { getPhrases } from "@/server/viola-data";
import { getSettings } from "@/server/settings";
import { pickOne } from "@/utils/random";

export const metadata = { title: "Un abbraccio" };

export default async function AbbraccioPage() {
  const supabase = await createClient();
  const [lines, settings, { data }] = await Promise.all([
    getPhrases("hug"),
    getSettings(),
    supabase.from("media").select("*").eq("kind", "image").or("category.eq.adam,ai_avatar_enabled.eq.true").limit(30),
  ]);
  const photo = await signOne(supabase, pickOne(data ?? []));
  return <Hug lines={lines.map((l) => l.text)} photoUrl={photo?.url ?? null} adamName={settings.general.adamName} />;
}
