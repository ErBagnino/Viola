import { FearFlow, type FearChoice } from "@/features/fear/fear-flow";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";

export const metadata = { title: "Ho paura" };

export default async function PauraPage() {
  const settings = await getSettings();
  const contact = getContact(settings);
  const { texts, general } = settings;
  const choices: FearChoice[] = [
    { label: "Respira con me", href: "/viola/calma/respira?via=1", icon: "wind", primary: true },
    { label: "Grounding", href: "/viola/calma/grounding", icon: "footprints" },
    { label: "5-4-3-2-1", href: "/viola/calma/54321", icon: "hand" },
    { label: "Distraiti", href: "/viola/distraiti", icon: "gamepad" },
    { label: `Scrivi ad ${general.adamName}`, href: contact.whatsappUrl ?? "/viola/scrivi", icon: "message-heart" },
    { label: `Chiama ${general.adamName}`, href: contact.phoneUrl, icon: "phone" },
    { label: "Apri una dedica", href: "/viola/noi/dediche?caso=1", icon: "mail-heart" },
    { label: `Ho bisogno di ${general.adamName}`, href: "/viola/adam", icon: "heart-handshake" },
    { label: "Esci", href: "/viola", icon: "home" },
  ];
  return (
    <FearFlow
      intro1={texts.fearIntro1}
      intro2={texts.fearIntro2}
      steps={texts.fearSteps}
      feelings={texts.fearFeelings}
      choices={choices}
      safetyNote={texts.safetyNote}
      emergencyNumber={contact.emergencyNumber}
    />
  );
}
