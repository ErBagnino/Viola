import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NightSky } from "@/features/night/night-sky";
import { NightBreathing } from "@/features/night/night-breathing";
import { getBreathingData } from "@/server/breathing-data";
import { getSettings } from "@/server/settings";
import { phraseOfTheDay } from "@/server/viola-data";
import { getDedications } from "@/server/noi-data";
import { pickOne } from "@/utils/random";
import { Markdown } from "@/components/ui/markdown";

export const metadata = { title: "Buonanotte" };

export default async function BuonanottePage() {
  const settings = await getSettings();
  const [phrase, breathing, dedications] = await Promise.all([
    phraseOfTheDay("good_night", settings.general.timezone, "Buonanotte amore mio."),
    getBreathingData(),
    getDedications(settings.general.signature),
  ]);
  const preset = breathing.presets.find((p) => /notte|sonno|dorm/i.test(p.name)) ?? breathing.presets[breathing.presets.length - 1];
  const dedication = pickOne(dedications.filter((d) => ["love", "no_reason", "miss_me"].includes(d.category))) ?? pickOne(dedications);
  const photo = breathing.photos[0];

  return (
    <div className="relative -mx-4 -mt-5 min-h-dvh px-4 pt-5 text-moon sm:-mx-6 sm:px-6">
      <NightSky />
      <div className="relative z-10 space-y-6">
        <Link href="/viola" className="press inline-grid size-11 place-items-center rounded-2xl bg-white/10" aria-label="Indietro">
          <ChevronLeft className="size-6" />
        </Link>
        <header className="pt-16">
          <h1 className="font-display text-[2.6rem] leading-none font-semibold text-moon">Buonanotte {settings.general.violaNickname} ♡</h1>
          <p className="mt-4 font-display text-xl text-moon/80 italic">{phrase}</p>
        </header>
        {photo && (
          <figure className="mx-auto w-3/4 rotate-2 polaroid rounded-md p-2 pb-4 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Noi" className="aspect-square w-full rounded-sm object-cover" />
            <figcaption className="mt-2 text-center font-hand text-xl text-night-800">sogni d&apos;oro</figcaption>
          </figure>
        )}
        <NightBreathing preset={preset} photos={breathing.photos} endText="Ora chiudi gli occhi. Sei al sicuro. ♡" />
        {dedication && (
          <article className="rounded-4xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="font-hand text-xl text-wine-200">Una dedica per la notte</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{dedication.title}</h2>
            <Markdown className="mt-2 text-moon/85">{dedication.body}</Markdown>
            <p className="mt-3 text-right font-hand text-xl text-wine-200">{dedication.signature}</p>
          </article>
        )}
      </div>
    </div>
  );
}
