"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore, useTransition } from "react";
import { ArrowLeft, ArrowRight, Eye, LayoutDashboard, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { callAction } from "@/utils/call-action";
import { setReadinessCheck } from "@/features/readiness/actions";

/** "Fai il giro": the places Adam should see with Viola's eyes, in order. */
export const TOUR = [
  { href: "/viola", title: "Home", hint: "La prima cosa che vede: saluto, countdown, cuore e i pulsanti principali." },
  { href: "/viola/adam", title: "Ho bisogno di Adam", hint: "Puoi premere il pulsante: in anteprima non parte nessuna notifica." },
  { href: "/viola/calma", title: "Calma", hint: "Respirazione, grounding e \"Ho paura\". Funzionano anche senza internet." },
  { href: "/viola/noi", title: "Noi", hint: "Foto, ricordi, dediche e buste: vedi solo quello che è pubblicato." },
  { href: "/viola/giochi", title: "Giochi", hint: "Prova il Memory: le carte usano le vostre foto." },
  { href: "/viola/ai", title: "Adam AI", hint: "Fai una domanda in Generale, Personale e Conforto." },
  { href: "/viola/altro", title: "Altro", hint: "Notifiche, privacy e tutto il resto." },
] as const;

const KEY = "vio:giro";
const listeners = new Set<() => void>();
const readTour = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const writeTour = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: the tour simply does not persist */
  }
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Which tour step a path belongs to (the longest matching prefix). */
export function tourStep(path: string) {
  let best = 0;
  TOUR.forEach((s, i) => {
    if ((path === s.href || path.startsWith(`${s.href}/`)) && s.href.length >= TOUR[best].href.length) best = i;
  });
  return best;
}

/**
 * Shown only to Adam inside Viola's app: a clear "this is a preview" bar
 * (nothing is saved or sent) and the optional guided tour.
 */
export function PreviewBar() {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const fromLink = params.get("giro") === "1";
  const stored = useSyncExternalStore(subscribe, readTour, () => false);
  const touring = stored || fromLink;

  useEffect(() => {
    if (fromLink) writeTour(true);
  }, [fromLink]);

  const i = tourStep(path);
  const step = TOUR[i];
  const last = i === TOUR.length - 1;

  const finish = () =>
    start(async () => {
      const res = await callAction(() => setReadinessCheck("preview-tour", "done"));
      writeTour(false);
      toast.show(res.ok ? "Giro completato ♡" : res.error, res.ok ? "love" : "error");
      router.push("/admin/completa");
    });

  if (!touring) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-lilac-100 px-3 py-2 text-xs font-bold text-lilac-600">
        <Eye className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">Vedi come Viola · qui niente viene salvato o inviato</span>
        <button type="button" onClick={() => (writeTour(true), router.push(TOUR[0].href))} className="press rounded-full bg-surface px-2.5 py-1 text-vio-800">
          Fai il giro
        </button>
        <Link href="/admin" className="press inline-flex items-center gap-1 rounded-full px-2 py-1 lg:hidden">
          <LayoutDashboard className="size-3.5" /> Pannello
        </Link>
      </div>
    );
  }

  return (
    <section className="sticky top-2 z-30 mb-4 rounded-3xl bg-night-800 p-4 text-moon shadow-soft ring-1 ring-white/10" aria-label="Giro come Viola">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold tracking-widest text-white/60 uppercase">
          Giro come Viola · {i + 1} di {TOUR.length}
        </p>
        <button type="button" onClick={() => writeTour(false)} className="press -m-2 grid size-10 place-items-center rounded-full text-white/70" aria-label="Esci dal giro">
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-0.5 font-display text-lg font-semibold">{step.title}</p>
      <p className="text-sm text-white/80">{step.hint}</p>
      <div className="mt-3 flex gap-2">
        {i > 0 && (
          <Link href={TOUR[i - 1].href} className="press inline-flex h-10 items-center gap-1 rounded-xl bg-white/10 px-3 text-sm font-bold">
            <ArrowLeft className="size-4" /> Indietro
          </Link>
        )}
        {last ? (
          <button type="button" onClick={finish} disabled={pending} className="press ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl bg-rouge-500 px-4 text-sm font-extrabold text-white disabled:opacity-60">
            Fine ♡
          </button>
        ) : (
          <Link href={TOUR[i + 1].href} className="press ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-extrabold text-night-900">
            {TOUR[i + 1].title} <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </section>
  );
}
