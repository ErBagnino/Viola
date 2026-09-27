import { PageHeader } from "@/components/ui/page-header";
import { NeedAdam } from "@/features/need-adam/need-adam";
import { createViolaClient } from "@/server/viola-view";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";
import { formatDateTime } from "@/utils/dates";

export const metadata = { title: "Ho bisogno di Adam" };

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Inviata", cls: "bg-peach-100 text-vio-800" },
  seen: { label: "Adam l'ha vista ♡", cls: "bg-lilac-100 text-lilac-600" },
  responded: { label: "Adam ha risposto", cls: "bg-wine-600 text-white" },
  closed: { label: "Chiusa", cls: "bg-cream-200 text-ink-soft" },
};

export default async function NeedAdamPage() {
  const settings = await getSettings();
  const contact = getContact(settings);
  const supabase = await createViolaClient();
  const { data: recent } = await supabase.from("adam_requests").select("*").order("created_at", { ascending: false }).limit(5);
  const { texts, general } = settings;

  return (
    <div>
      <PageHeader title={texts.needAdamTitle} subtitle={`Premi il cuore: ${general.adamName} riceve subito un avviso.`} back="/viola" />
      <NeedAdam
        button={texts.needAdamButton}
        placeholder={texts.needAdamPlaceholder}
        sentText={texts.needAdamSent}
        fallbackText={texts.needAdamFallback}
        adamName={general.adamName}
        whatsappNumber={contact.whatsappNumber}
        whatsappMessages={contact.messages}
        phoneUrl={contact.phoneUrl}
      />
      {recent && recent.length > 0 && (
        <section className="mt-10" aria-labelledby="recent-req">
          <h2 id="recent-req" className="mb-3 px-1 font-sans text-xs font-extrabold tracking-widest text-vio-500 uppercase">
            Le tue ultime richieste
          </h2>
          <ul className="space-y-2">
            {recent.map((r) => {
              const s = STATUS[r.status] ?? STATUS.new;
              return (
                <li key={r.id} className="paper rounded-3xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink-soft">{formatDateTime(r.created_at, general.timezone)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${s.cls}`}>{s.label}</span>
                  </div>
                  {r.message && <p className="mt-2 text-[15px] text-vio-900">“{r.message}”</p>}
                  {r.response && (
                    <p className="mt-2 rounded-2xl bg-blush-50 px-3 py-2 text-[15px] text-vio-800">
                      <span className="font-hand text-lg text-vio-500">{general.adamName}: </span>
                      {r.response}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
