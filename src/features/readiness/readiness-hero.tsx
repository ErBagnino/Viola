import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LEVEL_META, readinessMessage } from "./tasks";
import { PRIORITY_META, type Priority, type ReadinessSummary } from "./types";
import { cn } from "@/utils/cn";

const LEVEL_PILL = {
  ready: "bg-emerald-400/20 text-emerald-50 ring-emerald-300/40",
  almost: "bg-amber-300/20 text-amber-50 ring-amber-200/40",
  todo: "bg-white/15 text-white ring-white/30",
} as const;

function Ring({ percent }: { percent: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 72 72" className="size-20 shrink-0 -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={7} />
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
    </svg>
  );
}

/** "Vio ♡ è pronta al 78%": the big card of "Completa Vio ♡". */
export function ReadinessHero({ summary, violaName, link }: { summary: ReadinessSummary; violaName: string; link?: boolean }) {
  const msg = readinessMessage(summary, violaName);
  const level = LEVEL_META[summary.level];
  const body = (
    <>
      <span className="absolute -top-10 -right-10 size-40 rounded-full bg-white/5" aria-hidden />
      <div className="relative flex items-center gap-4">
        <div className="relative grid place-items-center text-white">
          <Ring percent={summary.percent} />
          <span className="absolute font-display text-xl font-semibold">{summary.percent}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold tracking-widest text-wine-200 uppercase">Completa Vio ♡</p>
          <p className="font-display text-2xl leading-tight font-semibold sm:text-3xl">
            {summary.remaining === 0 ? msg.title : `Vio ♡ è pronta al ${summary.percent}%`}
          </p>
          <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ring-1", LEVEL_PILL[summary.level])}>
            {level.dot} {level.label}
          </span>
        </div>
      </div>
      <div className="relative mt-4 space-y-0.5">
        {summary.remaining > 0 && <p className="font-bold">{msg.title}</p>}
        <p className="text-sm text-wine-100">
          {summary.remaining === 0
            ? msg.text
            : `${summary.remaining === 1 ? "C'è ancora 1 cosa" : `Ci sono ancora ${summary.remaining} cose`} da completare. ${msg.text}`}
        </p>
      </div>
      {link && (
        <span className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-wine-700">
          {summary.remaining ? "Completa" : "Rivedi"} <ArrowRight className="size-4" />
        </span>
      )}
    </>
  );
  const cls = "relative block overflow-hidden rounded-4xl bg-gradient-to-br from-wine-600 to-wine-800 p-5 text-white shadow-soft";
  return link ? (
    <Link href="/admin/completa" className={cn("press", cls)}>
      {body}
    </Link>
  ) : (
    <section className={cls} aria-label="Quanto è pronta Vio ♡">
      {body}
    </section>
  );
}

/** "Per te, Adam ♡": the next few things, grouped by importance. */
export function NextSteps({ summary, limit = 3 }: { summary: ReadinessSummary; limit?: number }) {
  const groups = (["essential", "recommended", "optional"] as Priority[])
    .map((p) => ({ p, tasks: summary.tasks.filter((t) => !t.done && t.priority === p) }))
    .filter((g) => g.tasks.length);
  if (!groups.length) return null;
  return (
    <section className="paper rounded-4xl p-5" aria-labelledby="next-steps">
      <h2 id="next-steps" className="font-display text-lg font-semibold text-vio-900">
        Per te, Adam ♡
      </h2>
      <p className="mb-3 text-sm text-ink-soft">Le prossime cose da fare. Ogni pulsante ti porta nel punto giusto.</p>
      <div className="space-y-4">
        {groups.map(({ p, tasks }) => (
          <div key={p}>
            <p className="mb-1.5 text-xs font-extrabold tracking-wider text-ink-muted uppercase">
              {PRIORITY_META[p].dot} {PRIORITY_META[p].label}
            </p>
            <ul className="space-y-1.5">
              {tasks.slice(0, limit).map((t) => (
                <li key={t.id}>
                  <Link href={t.href} className="press flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-vio-900">{t.title}</span>
                      {t.detail && <span className="block truncate text-xs text-ink-muted">{t.detail}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-extrabold text-wine-600 dark:text-vio-600">{t.cta} →</span>
                  </Link>
                </li>
              ))}
            </ul>
            {tasks.length > limit && (
              <Link href="/admin/completa" className="mt-0.5 inline-flex min-h-10 items-center text-xs font-bold text-vio-600 underline-offset-2 hover:underline">
                e altre {tasks.length - limit} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
