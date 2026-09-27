import Link from "next/link";
import { AdminHeader } from "@/components/layout/admin-header";
import { SettingsForm } from "@/features/settings/settings-form";
import { SETTINGS_FORMS } from "@/features/settings/fields";
import { ModelChecker } from "@/features/admin/model-checker";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";
import { isAiConfigured } from "@/server/ai/gemini";
import { todayKey } from "@/utils/dates";

export const metadata = { title: "Adam AI" };

export default async function AdminAiPage() {
  const settings = await getSettings();
  const supabase = await createClient();
  const { data: usage } = await supabase.from("ai_usage_daily").select("*").eq("day", todayKey(settings.general.timezone));
  const viola = (usage ?? []).filter((u) => u.scope === "viola").reduce((s, u) => s + u.requests, 0);
  const copilot = (usage ?? []).filter((u) => u.scope === "copilot").reduce((s, u) => s + u.requests, 0);
  const profile = SETTINGS_FORMS.ai_profile!;
  const ai = SETTINGS_FORMS.ai!;
  return (
    <div className="space-y-5">
      <AdminHeader title="Adam AI" description="Profilo, personalità, memoria e limiti gratuiti dell'assistente che hai creato per Viola." icon="bot-heart" />
      <section className="paper rounded-4xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${isAiConfigured() ? "bg-green-100 text-green-800" : "bg-peach-100 text-vio-800"}`}>
            {isAiConfigured() ? "GEMINI CONFIGURATO" : "MANCA GEMINI_API_KEY"}
          </span>
          <span className="text-sm text-ink-soft">
            Oggi: <b>{viola}</b>/{settings.ai.dailyMessageLimit} richieste di Viola · <b>{copilot}</b>/{settings.ai.copilotDailyLimit} del Copilot
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/ai-memoria" className="press rounded-full bg-wine-700 px-4 py-2 text-sm font-bold text-white">
            Memoria di Adam AI →
          </Link>
          <Link href="/viola/ai" className="press rounded-full bg-surface px-4 py-2 text-sm font-bold text-vio-700">
            Prova la chat come Viola
          </Link>
        </div>
        <div className="mt-4">
          <ModelChecker />
        </div>
      </section>
      <SettingsForm settingsKey="ai_profile" title={profile.title} description={profile.description} fields={profile.fields} initial={settings.ai_profile} />
      <SettingsForm settingsKey="ai" title={ai.title} description={ai.description} fields={ai.fields} initial={settings.ai} />
    </div>
  );
}
