import { PageHeader } from "@/components/ui/page-header";
import { ActionCard } from "@/features/home/action-card";
import { PushToggle } from "@/features/push/push-toggle";
import { PrivacyPanel } from "@/features/privacy/privacy-panel";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Altro" };

export default async function AltroPage() {
  const { general } = await getSettings();
  const adam = general.adamName;
  const sections = [
    {
      title: "Per me",
      items: [
        { href: "/viola/umore", title: "Come mi sento", subtitle: "Il mio umore", icon: "smile", color: "peach" },
        { href: "/viola/diario", title: "Dimmi tutto", subtitle: "Il mio diario", icon: "notebook-pen", color: "cream" },
        { href: "/viola/scrivi", title: `Scrivi ad ${adam}`, subtitle: "Un messaggio nell'app", icon: "pen", color: "blush" },
        { href: "/viola/parliamo", title: "Voglio parlare", subtitle: "Con Adam o con Adam AI", icon: "message-heart", color: "lilac" },
      ],
    },
    {
      title: "Per svagarmi",
      items: [
        { href: "/viola/giochi", title: "Giochi", subtitle: "Piccoli giochi per noi", icon: "gamepad", color: "lilac" },
        { href: "/viola/sorpresa", title: "Sorprendimi", subtitle: "Non sai cosa uscirà", icon: "gift", color: "red" },
        { href: "/viola/oggi", title: "Una cosa per te", subtitle: "La sorpresa di oggi", icon: "sparkles", color: "blush" },
        { href: "/viola/sorridi", title: "Voglio sorridere", subtitle: "Una cosa leggera", icon: "laugh", color: "peach" },
        { href: "/viola/distraiti", title: "Voglio distrarmi", subtitle: "Idee e giochi", icon: "shuffle", color: "cream" },
      ],
    },
    {
      title: "Momenti",
      items: [
        { href: "/viola/abbraccio", title: "Voglio un abbraccio", subtitle: "Chiudi gli occhi", icon: "heart-handshake", color: "wine" },
        { href: "/viola/buongiorno", title: "Buongiorno", subtitle: "Per iniziare bene", icon: "sunrise", color: "peach" },
        { href: "/viola/buonanotte", title: "Buonanotte", subtitle: "Stelle e luna", icon: "moon-star", color: "night" },
        { href: "/viola/audio", title: `La voce di ${adam}`, subtitle: "Vocali e canzoni", icon: "headphones", color: "blush" },
      ],
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Altro" subtitle="Tutte le piccole stanze della casa." />
      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="mb-3 px-1 font-sans text-xs font-extrabold tracking-widest text-wine-500 uppercase">{s.title}</h2>
          <div className="grid grid-cols-2 gap-3">
            {s.items.map((it, i) => (
              <ActionCard key={it.href} {...it} index={i} />
            ))}
          </div>
        </section>
      ))}
      <section className="paper space-y-4 rounded-4xl p-5">
        <h2 className="font-sans text-xs font-extrabold tracking-widest text-wine-500 uppercase">Impostazioni</h2>
        <PushToggle label={`Avvisi quando ${adam} ti risponde`} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blush-100 pt-4">
          <PrivacyPanel />
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
