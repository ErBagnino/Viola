import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { OpenWhenGrid } from "@/features/open-when/open-when-grid";
import { APP_ACTIONS, actionHref, isAppAction } from "@/features/actions/registry";
import { createViolaClient } from "@/server/viola-view";
import { mediaByIds, photoSrc } from "@/server/media";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";

export const metadata = { title: "Aprimi quando…" };

export default async function AprimiPage() {
  const supabase = await createViolaClient();
  const settings = await getSettings();
  const contact = getContact(settings);
  const { data } = await supabase.from("open_when_cards").select("*").order("position");
  const media = await mediaByIds(supabase, (data ?? []).flatMap((c) => [c.media_id, c.audio_id]));
  const cards = (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    body: c.body,
    imageUrl: c.media_id ? (media.get(c.media_id)?.url ?? null) : null,
    photo: c.media_id ? photoSrc(media.get(c.media_id)) : null,
    audioUrl: c.audio_id ? (media.get(c.audio_id)?.url ?? null) : null,
    animation: c.animation,
    ctaHref: actionHref(c.cta_action, contact),
    ctaLabel: isAppAction(c.cta_action) ? APP_ACTIONS[c.cta_action].label : null,
    color: c.color,
    icon: c.icon,
    openedCount: c.opened_count,
  }));
  return (
    <div>
      <PageHeader title="Aprimi quando…" subtitle="Lettere da aprire nel momento giusto." back="/viola/noi" />
      {cards.length ? <OpenWhenGrid cards={cards} signature={settings.general.signature} /> : <EmptyState title="Le buste sono ancora chiuse" text={`${settings.general.adamName} le sta preparando ♡`} />}
    </div>
  );
}
