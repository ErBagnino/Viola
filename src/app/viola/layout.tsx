import { VioShell } from "@/components/layout/vio-shell";
import { FloatingHearts } from "@/components/decor/floating-hearts";
import { Onboarding } from "@/features/onboarding/onboarding";
import { requireMember } from "@/server/auth";
import { getSettings } from "@/server/settings";

export default async function ViolaLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireMember();
  const settings = await getSettings();
  const showOnboarding = viewer.role === "user" && !viewer.onboardedAt && settings.onboarding.enabled;

  return (
    <>
      <FloatingHearts count={8} />
      <VioShell appName={settings.general.appName} isAdmin={viewer.role === "admin"}>
        {children}
      </VioShell>
      {showOnboarding && <Onboarding slides={settings.onboarding.slides} cta={settings.onboarding.cta} />}
    </>
  );
}
