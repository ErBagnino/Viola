import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CapsuleList } from "@/features/capsules/capsule-list";
import { createViolaClient } from "@/server/viola-view";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Capsule del tempo" };

export default async function CapsulePage() {
  const supabase = await createViolaClient();
  const [{ data }, settings] = await Promise.all([supabase.rpc("list_time_capsules"), getSettings()]);
  const items = (data ?? []).map((c) => ({ id: c.id, title: c.title, teaser: c.teaser, unlockAt: c.unlock_at, unlocked: c.is_unlocked, openedAt: c.opened_at }));
  return (
    <div>
      <PageHeader title="Capsule del tempo" subtitle="Lettere che si aprono solo al momento giusto." back="/viola/noi" />
      {items.length ? (
        <CapsuleList items={items} lockedText={settings.texts.capsuleLocked} readyText={settings.texts.capsuleReady} signature={settings.general.signature} />
      ) : (
        <EmptyState title="Nessuna capsula, per ora" text="Un giorno qui arriverà una lettera per te ♡" />
      )}
    </div>
  );
}
