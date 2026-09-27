import { Bot, Eye, Lock, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { PrivacyPanel } from "@/features/privacy/privacy-panel";
import { ShareActivityToggle } from "@/features/privacy/share-activity-toggle";

export const metadata = { title: "La tua privacy" };

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="paper rounded-4xl p-5">
      <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-vio-900">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-tint-50 text-rouge-500">{icon}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

// Plain-language summary of who can see what. Mirrors the database rules
// (RLS) — if those change, this page must change too.
export default async function PrivacyPage() {
  const viewer = await requireMember();
  const settings = await getSettings();
  const adam = settings.general.adamName;
  const ai = settings.ai_profile.name;
  const supabase = await createClient();
  const { data: facts } = await supabase.from("ai_memory").select("key, value").eq("enabled", true).eq("visible_to_viola", true).order("category").limit(50);
  const admin = createAdminClient();
  const hidden = admin ? ((await admin.from("ai_memory").select("id", { count: "exact", head: true }).eq("enabled", true).eq("visible_to_viola", false)).count ?? 0) : 0;

  return (
    <div className="space-y-4">
      <PageHeader title="La tua privacy" subtitle="Chi vede cosa, detto semplice." back="/viola/altro" />

      <Block icon={<Lock className="size-5" />} title="Resta solo tuo">
        <ul className="list-disc space-y-1 pl-5">
          <li>Le pagine del diario che lasci <strong className="text-vio-800">private</strong> (è la scelta di partenza).</li>
          <li>L&apos;umore quando scegli <strong className="text-vio-800">&quot;Solo per me&quot;</strong>.</li>
          <li>
            Le tue chat con {ai}: {adam} non può leggerle nell&apos;app.
          </li>
        </ul>
      </Block>

      <Block icon={<Eye className="size-5" />} title={`Cosa vede ${adam}`}>
        <ul className="list-disc space-y-1 pl-5">
          <li>I messaggi che gli scrivi e le richieste &quot;Ho bisogno di {adam}&quot;.</li>
          <li>L&apos;umore quando scegli &quot;{adam} può vederlo&quot; e le pagine di diario che condividi.</li>
          <li>Se vuoi, quali esercizi o giochi hai usato (per esempio &quot;una respirazione&quot;), mai cosa hai scritto.</li>
        </ul>
        <div className="pt-2">
          <ShareActivityToggle initial={viewer.shareActivity} adamName={adam} />
        </div>
        <p className="text-sm">Con &quot;Non mostrare il testo nella notifica&quot; il tuo messaggio non compare nell&apos;avviso sul telefono di {adam}: lo legge solo aprendo l&apos;app.</p>
      </Block>

      <Block icon={<Bot className="size-5" />} title={`Cosa sa ${ai}`}>
        <p>
          Non è {adam}: è un&apos;intelligenza artificiale. Di voi sa solo quello che {adam} gli ha insegnato
          {facts?.length ? ":" : " (per ora niente)."}
        </p>
        {facts && facts.length > 0 && (
          <ul className="space-y-1 rounded-2xl bg-tint-50 p-3 text-sm">
            {facts.map((f) => (
              <li key={f.key}>
                <strong className="text-vio-800">{f.key}</strong>: {f.value}
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 && (
          <p className="text-sm">
            …e {hidden === 1 ? "un'altra cosa" : `altre ${hidden} cose`} che {adam} ha tenuto per sé (magari una sorpresa ♡).
          </p>
        )}
        <p className="text-sm">
          Per rispondere, quello che scrivi a {ai} passa dai server di Google (Gemini). Con il piano gratuito Google può usarlo per migliorare i suoi
          servizi: non scriverci password, documenti o dati sulla salute.
        </p>
      </Block>

      <Block icon={<Smartphone className="size-5" />} title="Sul tuo telefono">
        <p>Solo piccole comodità: le ultime idee già viste, la tua email per il login e i contatti di {adam}, così puoi chiamarlo anche senza internet.</p>
        <p className="text-sm">
          Nota onesta: {adam} gestisce il database dell&apos;app, quindi tecnicamente potrebbe accedere ai dati da lì. L&apos;app però non gli mostra mai
          quello che resta solo tuo.
        </p>
      </Block>

      <section className="paper flex flex-wrap items-center justify-between gap-2 rounded-4xl p-4">
        <p className="text-sm text-ink-soft">Vuoi cancellare qualcosa per sempre?</p>
        <PrivacyPanel />
      </section>
    </div>
  );
}
