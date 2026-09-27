import { AdminHeader } from "@/components/layout/admin-header";
import { SettingsForm } from "@/features/settings/settings-form";
import { SETTINGS_FORMS } from "@/features/settings/fields";
import type { SettingsKey } from "@/features/settings/schema";
import { getSettings } from "@/server/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Impostazioni" };

const KEYS: SettingsKey[] = ["general", "onboarding", "contact", "distance", "calm", "texts"];

export default async function ImpostazioniPage() {
  const settings = await getSettings();
  const supabase = await createClient();
  const { data: countdowns } = await supabase.from("countdowns").select("id, title").order("target_at");
  const countdownOptions = (countdowns ?? []).map((c) => ({ value: c.id, label: c.title }));
  return (
    <div className="space-y-5">
      <AdminHeader title="Impostazioni" description="Tutti i testi e le opzioni dell'app. Nessun codice da toccare." icon="palette" />
      {KEYS.map((k) => {
        const form = SETTINGS_FORMS[k]!;
        return (
          <SettingsForm
            key={k}
            settingsKey={k}
            title={form.title}
            description={form.description}
            fields={form.fields}
            initial={settings[k] as Record<string, unknown>}
            extraOptions={k === "distance" ? { countdownId: countdownOptions } : undefined}
          />
        );
      })}
    </div>
  );
}
