import Link from "next/link";
import { Images } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionCard } from "@/features/home/action-card";
import { Sparkle } from "@/components/decor/stars";
import { getSettings } from "@/server/settings";
import { requireMember } from "@/server/auth";
import { getHeartState } from "@/server/hearts";
import { HeartExchange } from "@/features/hearts/heart-exchange";
import { todayKey } from "@/utils/dates";

export const metadata = { title: "Noi" };

const ITEMS = [
  { href: "/viola/noi/foto", title: "Foto", subtitle: "Le nostre foto", icon: "image", color: "peach" },
  { href: "/viola/noi/ricordi", title: "Ricordi", subtitle: "Le nostre cose", icon: "book-heart", color: "cream" },
  { href: "/viola/noi/dediche", title: "Dediche", subtitle: "Per te ♡", icon: "mail-heart", color: "blush" },
  { href: "/viola/noi/aprimi", title: "Aprimi quando…", subtitle: "Buste per ogni momento", icon: "gift", color: "lilac" },
  { href: "/viola/noi/countdown", title: "Countdown", subtitle: "I giorni che contiamo", icon: "hourglass", color: "lilac" },
  { href: "/viola/noi/distanza", title: "Distanza", subtitle: "", icon: "map-pin", color: "peach" },
  { href: "/viola/noi/capsule", title: "Capsule del tempo", subtitle: "Lettere dal futuro", icon: "alarm", color: "wine" },
  { href: "/viola/audio", title: "La voce di Adam", subtitle: "Vocali e canzoni", icon: "headphones", color: "blush" },
];

export default async function NoiPage() {
  const [{ distance, general }, viewer] = await Promise.all([getSettings(), requireMember()]);
  const hearts = await getHeartState(viewer.id);
  // Whole days since the date Adam set (in Rome time), e.g. "Insieme da 412 giorni ♡".
  const together = general.togetherSince
    ? Math.floor((Date.parse(todayKey(general.timezone)) - Date.parse(general.togetherSince)) / 86_400_000)
    : null;
  const items = ITEMS.map((it) =>
    it.href === "/viola/noi/distanza"
      ? { ...it, subtitle: `${distance.fromName} ↔ ${distance.toName}` }
      : it.href === "/viola/audio"
        ? { ...it, title: `La voce di ${general.adamName}` }
        : it,
  );
  return (
    <div>
      <PageHeader title="Noi" subtitle={together !== null && together >= 0 ? `Insieme da ${together.toLocaleString("it-IT")} ${together === 1 ? "giorno" : "giorni"} ♡` : "Tutto quello che è nostro."} />
      <div className="mb-4">
        <HeartExchange state={hearts} otherName={general.adamName} compact />
      </div>
      <Link
        href="/viola/noi/foto/random"
        className="press btn-3d relative mb-4 flex items-center gap-4 overflow-hidden rounded-4xl bg-gradient-to-br from-rouge-400 to-wine-700 p-5 text-white"
      >
        <Sparkle className="absolute top-3 right-4 size-4 animate-twinkle text-white" />
        <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
          <Images className="size-6" />
        </span>
        <span>
          <span className="block font-display text-2xl font-semibold">Fammi vedere noi.</span>
          <span className="block text-sm text-white/80">Una foto a caso, adesso</span>
        </span>
      </Link>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it, i) => (
          <ActionCard key={it.href} {...it} index={i} />
        ))}
      </div>
    </div>
  );
}
