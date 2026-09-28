"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Stethoscope, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callAction } from "@/utils/call-action";
import { relativeTime } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { runCheckup } from "./actions";
import type { CheckupItem } from "./types";

const LEVEL = {
  ok: { icon: CheckCircle2, cls: "text-emerald-600" },
  warn: { icon: AlertTriangle, cls: "text-amber-600" },
  error: { icon: XCircle, cls: "text-rouge-600" },
} as const;

/** "Controllo Vio ♡": one button that really tries what can silently break. */
export function Checkup() {
  const [items, setItems] = useState<CheckupItem[] | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setError(null);
      const res = await callAction(() => runCheckup());
      if (!res.ok) return setError(res.error);
      setItems(res.items);
      setAt(res.at);
    });

  const problems = items?.filter((i) => i.level !== "ok").length ?? 0;
  return (
    <section className="paper rounded-4xl p-5" aria-labelledby="checkup-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="checkup-title" className="font-display text-lg font-semibold text-vio-900">
            Controllo Vio ♡
          </h2>
          <p className="text-sm text-ink-soft">Prova davvero Telegram, Adam AI e le foto, e cerca errori nei contenuti. Non invia niente e non cambia niente.</p>
        </div>
        <Button onClick={run} loading={pending}>
          <Stethoscope className="size-4" /> {items ? "Ricontrolla" : "Controlla adesso"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm font-bold text-rouge-600">{error}</p>}
      {items && (
        <div className="mt-4" aria-live="polite">
          <p className="mb-2 text-sm font-bold text-vio-900">
            {problems === 0 ? "Tutto a posto ♡" : problems === 1 ? "C'è 1 cosa da guardare" : `Ci sono ${problems} cose da guardare`}
            {at && <span className="font-normal text-ink-muted"> · {relativeTime(at)}</span>}
          </p>
          <ul className="space-y-1.5">
            {items.map((it, i) => {
              const L = LEVEL[it.level];
              const row = (
                <>
                  <L.icon className={cn("mt-0.5 size-5 shrink-0", L.cls)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-vio-900">{it.title}</span>
                    {it.detail && <span className="block text-xs break-words text-ink-soft">{it.detail}</span>}
                  </span>
                  {it.href && <span className="shrink-0 text-xs font-extrabold text-wine-600 dark:text-rouge-400">Sistema →</span>}
                </>
              );
              return (
                <li key={i}>
                  {it.href ? (
                    <Link href={it.href} className="press flex items-start gap-3 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 rounded-2xl px-3 py-2">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
