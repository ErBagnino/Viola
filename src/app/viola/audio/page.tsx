import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { mediaByIds } from "@/server/media";
import { getSettings } from "@/server/settings";

export const metadata = { title: "La voce di Adam" };

const CAT: Record<string, string> = { voice: "Vocale", song: "Canzone", sleep: "Per dormire", breathing: "Respiro", other: "Audio" };

export default async function AudioPage() {
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([supabase.from("audio_items").select("*").order("position"), getSettings()]);
  const media = await mediaByIds(supabase, (data ?? []).map((a) => a.media_id));
  const items = (data ?? []).filter((a) => a.media_id && media.get(a.media_id));
  return (
    <div>
      <PageHeader title={`La voce di ${settings.general.adamName}`} subtitle="Vocali, canzoni, piccole cose da ascoltare." back="/viola/noi" />
      {items.length === 0 ? (
        <EmptyState title="Ancora nessun audio" text={`${settings.general.adamName} sta registrando qualcosa per te ♡`} emoji="🎧" />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="paper rounded-[1.75rem] p-4">
              <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">{CAT[a.category] ?? "Audio"}</p>
              <p className="mt-1 font-display text-lg font-semibold text-vio-900">{a.title}</p>
              {a.description && <p className="text-sm text-ink-soft">{a.description}</p>}
              <audio src={media.get(a.media_id!)!.url} controls preload="none" className="mt-3 w-full" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
