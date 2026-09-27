import { PageHeader } from "@/components/ui/page-header";
import { ActionCard } from "@/features/home/action-card";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";

export const metadata = { title: "Voglio parlare" };

export default async function ParliamoPage() {
  const settings = await getSettings();
  const contact = getContact(settings);
  const adam = settings.general.adamName;
  const items = [
    { href: "/viola/ai", title: `Chatta con ${settings.ai_profile.name}`, subtitle: settings.ai_profile.subtitle, icon: "bot-heart", color: "wine" },
    { href: "/viola/scrivi", title: `Scrivi ad ${adam}`, subtitle: "Un messaggio nell'app", icon: "pen", color: "blush" },
    contact.whatsappUrl && { href: contact.whatsappUrl, title: "WhatsApp", subtitle: `Scrivi ad ${adam} su WhatsApp`, icon: "message-heart", color: "peach" },
    contact.phoneUrl && { href: contact.phoneUrl, title: `Chiama ${adam}`, subtitle: "Sentire la sua voce", icon: "phone", color: "lilac" },
    { href: "/viola/diario", title: "Scrivilo nel diario", subtitle: "Anche solo per te", icon: "notebook-pen", color: "cream" },
  ].filter(Boolean) as { href: string; title: string; subtitle: string; icon: string; color: string }[];
  return (
    <div>
      <PageHeader title="Voglio parlare" subtitle="Con chi ti va, come ti va." back="/viola" />
      <div className="grid grid-cols-2 gap-3">
        {items.map((it, i) => (
          <ActionCard key={it.href} {...it} index={i} wide={i === 0} />
        ))}
      </div>
    </div>
  );
}
