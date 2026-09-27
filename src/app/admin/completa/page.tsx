import Link from "next/link";
import { AdminHeader } from "@/components/layout/admin-header";
import { requireAdmin } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { gameReadiness, getReadiness, photoUsage } from "@/server/readiness";
import { ReadinessHero } from "@/features/readiness/readiness-hero";
import { DoneRow, TaskRow } from "@/features/readiness/task-list";
import { Checkup } from "@/features/readiness/checkup";
import { PRIORITY_META, type Priority, type UsageRow } from "@/features/readiness/types";
import { cn } from "@/utils/cn";

export const metadata = { title: "Completa Vio ♡" };

const USAGE_STATE = {
  ready: { mark: "✓", label: "Pronto", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  todo: { mark: "⚠", label: "Da completare", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  optional: { mark: "○", label: "Facoltativo", cls: "bg-tint-100 text-ink-soft" },
} as const;

function UsageList({ id, title, text, rows }: { id: string; title: string; text: string; rows: UsageRow[] }) {
  return (
    <section className="paper rounded-4xl p-5" aria-labelledby={id}>
      <h2 id={id} className="font-display text-lg font-semibold text-vio-900">
        {title}
      </h2>
      <p className="mb-3 text-sm text-ink-soft">{text}</p>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const s = USAGE_STATE[r.state];
          return (
            <li key={r.label}>
              <Link href={r.href} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-vio-900">{r.label}</span>
                  <span className="block text-xs text-ink-muted">{r.detail}</span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold", s.cls)}>
                  {s.mark} {s.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Guide({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-24 rounded-3xl bg-surface p-4 ring-1 ring-line">
      <summary className="cursor-pointer font-bold text-vio-900">{title}</summary>
      <div className="mt-2 space-y-1.5 text-sm text-ink-soft [&_code]:rounded [&_code]:bg-tint-50 [&_code]:px-1 [&_code]:text-vio-800">{children}</div>
    </details>
  );
}

export default async function CompletaPage() {
  const admin = await requireAdmin();
  const settings = await getSettings();
  const { summary, facts } = await getReadiness(admin.id, settings);
  const viola = settings.general.violaName;
  const todo = (p: Priority) => summary.tasks.filter((t) => !t.done && t.priority === p);
  const done = summary.tasks.filter((t) => t.done);

  return (
    <div className="space-y-5">
      <AdminHeader
        title="Completa Vio ♡"
        icon="list-checks"
        description={`Tutto quello che serve perché sia pronta per ${viola}. Si aggiorna da solo mentre aggiungi le cose: non devi spuntare niente, tranne quello che non posso vedere.`}
      />
      <ReadinessHero summary={summary} violaName={viola} />

      {(["essential", "recommended", "optional"] as Priority[]).map((p) => {
        const tasks = todo(p);
        if (!tasks.length) return null;
        return (
          <section key={p} aria-labelledby={`p-${p}`}>
            <h2 id={`p-${p}`} className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-vio-900">
              {PRIORITY_META[p].dot} {PRIORITY_META[p].label}
              <span className="rounded-full bg-tint-100 px-2 text-xs font-extrabold text-ink-soft">{tasks.length}</span>
            </h2>
            <ul className="grid gap-2.5 lg:grid-cols-2 [&>*]:min-w-0">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </section>
        );
      })}

      {done.length > 0 && (
        <details className="paper rounded-4xl p-5" open={summary.remaining === 0}>
          <summary className="cursor-pointer font-display text-lg font-semibold text-vio-900">Già fatto ♡ ({done.length})</summary>
          <ul className="mt-2 grid gap-x-4 sm:grid-cols-2">
            {done.map((t) => (
              <DoneRow key={t.id} task={t} tz={settings.general.timezone} />
            ))}
          </ul>
        </details>
      )}

      <Checkup />

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <UsageList id="foto" title="Dove si usano le foto" text="Ogni posto dell'app che mostra le vostre foto, e se ne ha abbastanza." rows={photoUsage(facts)} />
        <UsageList id="giochi" title="I giochi" text="Si possono giocare con le vostre cose?" rows={gameReadiness(facts)} />
      </div>

      <section className="space-y-2.5" aria-labelledby="guide">
        <h2 id="guide" className="font-display text-lg font-semibold text-vio-900">
          Come si fa
        </h2>
        <Guide id="chiave-segreta" title="Sistemare la chiave segreta di Supabase">
          <p>
            1. Apri <b>supabase.com</b> → il tuo progetto → <b>Project Settings</b> → <b>API Keys</b>.
          </p>
          <p>
            2. In <b>Secret keys</b> premi <b>Reveal</b> e copia la chiave che inizia con <code>sb_secret_</code> (non la <code>sb_publishable_</code>). Se il progetto usa le chiavi vecchie: la <b>service_role</b>, non la anon.
          </p>
          <p>
            3. Vercel → progetto → <b>Settings</b> → <b>Environment Variables</b> → <code>SUPABASE_SERVICE_ROLE_KEY</code> → <b>Edit</b>, incolla, salva (tipo <b>Secret</b>, ambiente <b>Production</b>).
          </p>
          <p>
            4. <b>Deployments</b> → sull&apos;ultimo deploy <b>⋯</b> → <b>Redeploy</b>. Poi torna qui: l&apos;avviso rosso sparisce.
          </p>
        </Guide>
        <Guide id="come-aggiornare" title="Aggiornare il database">
          <p>
            1. Apri il progetto su <b>supabase.com</b> → <b>SQL Editor</b> → <b>New query</b>.
          </p>
          <p>
            2. Incolla tutto il file <code>supabase/update.sql</code> (è nel progetto) e premi <b>Run</b>.
          </p>
          <p>3. Fatto: si può rifare senza rischi, non cancella niente.</p>
        </Guide>
        <Guide id="account-viola" title={`Creare l'account di ${viola}`}>
          <p>
            1. Supabase → <b>Authentication</b> → <b>Users</b> → <b>Add user</b> → email e password, con &quot;Auto confirm user&quot; attivo.
          </p>
          <p>2. SQL Editor → incolla (cambia l&apos;email) e premi Run:</p>
          <pre className="overflow-x-auto rounded-xl bg-tint-50 p-2 text-xs text-vio-800">
            {`insert into public.profiles (id, role, display_name)
select id, 'user', '${viola.replace(/'/g, "''")}' from auth.users where email = lower('sua@email.it')
on conflict (id) do update set role = excluded.role;`}
          </pre>
          <p>La password resta solo in Supabase: l&apos;app non la vede mai. (In alternativa: SETUP.md, passo 8.)</p>
        </Guide>
        <Guide id="installa" title="Installare l'app sul telefono">
          <p>
            <b>iPhone</b>: apri il sito in Safari → Condividi → <b>Aggiungi alla schermata Home</b>.
          </p>
          <p>
            <b>Android</b>: Chrome → menu ⋮ → <b>Installa app</b>.
          </p>
          <p>Dopo, apri l&apos;app dall&apos;icona e attiva le notifiche in Altro → Notifiche.</p>
        </Guide>
        <Guide id="cron" title="Proteggere il &quot;tieni sveglio&quot;">
          <p>
            Vercel → Settings → Environment Variables → aggiungi <code>CRON_SECRET</code> con una frase lunga a caso (Secret). Poi rifai il deploy. Vercel la usa da sola.
          </p>
        </Guide>
      </section>
    </div>
  );
}
