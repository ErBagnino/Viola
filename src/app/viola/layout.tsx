import { VioShell } from "@/components/layout/vio-shell";
import { FloatingHearts } from "@/components/decor/floating-hearts";
import { Onboarding } from "@/features/onboarding/onboarding";
import { requireMember } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";
import { RememberContact } from "@/features/offline/emergency-contact";

export default async function ViolaLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireMember();
  const settings = await getSettings();
  const contact = getContact(settings);
  const showOnboarding = viewer.role === "user" && !viewer.onboardedAt && settings.onboarding.enabled;

  return (
    <>
      <FloatingHearts count={8} />
      <RememberContact adamName={settings.general.adamName} whatsappUrl={contact.whatsappUrl} phoneUrl={contact.phoneUrl} />
      <VioShell appName={settings.general.appName} isAdmin={viewer.role === "admin"}>
        {children}
      </VioShell>
      {showOnboarding && <Onboarding slides={settings.onboarding.slides} cta={settings.onboarding.cta} />}
    </>
  );
}
