import Link from "next/link";
import { MessageCircleHeart, Sunrise } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Sparkle } from "@/components/decor/stars";
import { createClient } from "@/lib/supabase/server";
import { signOne } from "@/server/media";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";
import { phraseOfTheDay } from "@/server/viola-data";
import { whatsappLink } from "@/features/actions/registry";
import { todayKey } from "@/utils/dates";
import { seededRandom } from "@/utils/random";

export const metadata = { title: "Buongiorno" };

export default async function BuongiornoPage() {
  const settings = await getSettings();
  const tz = settings.general.timezone;
  const supabase = await createClient();
  const [phrase, mission, { data }] = await Promise.all([
    phraseOfTheDay("good_morning", tz, "Buongiorno amore ♡"),
    phraseOfTheDay("mission", tz, "Bevi un bicchiere d'acqua."),
    supabase.from("media").select("*").eq("kind", "image").contains("contexts", ["home"]).limit(100),
  ]);
  const pool = data ?? [];
  const pick = pool.length ? pool[Math.floor(seededRandom(`gm:${todayKey(tz)}`)() * pool.length)] : null;
  const photo = await signOne(supabase, pick);
  const contact = getContact(settings);
  const wa = whatsappLink(contact.whatsappNumber, `Buongiorno ${settings.general.adamName} ♡`);

  return (
    <div className="space-y-5">
      <PageHeader title={`Buongiorno ${settings.general.violaNickname} ♡`} back="/viola" />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-peach-200 via-blush-100 to-cream-50 p-6 shadow-soft">
        <Sunrise className="absolute -top-2 -right-2 size-28 text-peach-300/60" strokeWidth={1} />
        <Sparkle className="absolute bottom-4 left-5 size-4 animate-twinkle text-white" />
        <p className="relative font-display text-2xl leading-snug text-wine-900">{phrase}</p>
      </section>
      {photo && (
        <figure className="mx-auto w-4/5 -rotate-2 rounded-md bg-white p-2 pb-4 shadow-float">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.title ?? "Noi"} className="aspect-square w-full rounded-sm object-cover" />
          <figcaption className="mt-2 text-center font-hand text-xl text-wine-700">{photo.title || "per il tuo buongiorno"}</figcaption>
        </figure>
      )}
      <section className="paper rounded-4xl p-5">
        <p className="text-xs font-extrabold tracking-widest text-wine-500 uppercase">La micro missione di oggi</p>
        <p className="mt-2 font-display text-xl font-semibold text-wine-900">{mission}</p>
      </section>
      {wa && (
        <Link href={wa} target="_blank" rel="noopener noreferrer" className="press btn-3d flex items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-4 font-extrabold text-white">
          <MessageCircleHeart className="size-5" /> Dai il buongiorno ad {settings.general.adamName}
        </Link>
      )}
    </div>
  );
}
