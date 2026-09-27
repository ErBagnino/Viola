"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Eye, MessageCircleReply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/utils/cn";
import { formatDateTime, relativeTime } from "@/utils/dates";
import { respondToRequest, setRequestStatus } from "./inbox-actions";
import { callAction } from "@/utils/call-action";
import { REQUEST_STATUS } from "@/features/content/constants";

export type RequestView = {
  id: string;
  message: string | null;
  status: string;
  response: string | null;
  createdAt: string;
  notified: string[];
  ok: boolean;
  events: { channel: string; status: string; detail: string | null }[];
};

const STATUS = REQUEST_STATUS;
const CHANNEL: Record<string, string> = { telegram: "Telegram", webpush: "Notifica push", whatsapp: "WhatsApp", none: "Avviso automatico" };

export function RequestsList({ items, tz, violaName, quickReplies = [] }: { items: RequestView[]; tz: string; violaName: string; quickReplies?: string[] }) {
  const [pending, start] = useTransition();
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState("");
  const toast = useToast();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, ok?: string) =>
    start(async () => {
      const r = await callAction(fn);
      if (r.ok) {
        if (ok) toast.show(ok);
        router.refresh();
      } else toast.show(r.error ?? "Errore", "error");
    });

  if (!items.length) return <EmptyState title="Nessuna richiesta" text={`Quando ${violaName} premerà "Ho bisogno di Adam" la troverai qui.`} />;

  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id} className={cn("paper rounded-4xl p-5", r.status === "new" && "ring-2 ring-rouge-400")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-lg font-semibold text-vio-900">
              {formatDateTime(r.createdAt, tz)}{" "}
              <span className="text-sm font-normal text-ink-muted" suppressHydrationWarning>
                · {relativeTime(r.createdAt)}
              </span>
            </p>
            <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", STATUS[r.status]?.cls)}>{STATUS[r.status]?.label ?? r.status}</span>
          </div>
          <p className="mt-2 text-[17px] text-vio-900">{r.message ? `“${r.message}”` : <span className="text-ink-muted">Nessun messaggio: solo &quot;ho bisogno di te&quot;.</span>}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {r.events.length === 0 && <span className="rounded-full bg-cream-200 px-2.5 py-1 font-bold text-ink-soft">nessuna notifica registrata</span>}
            {r.events.map((e, i) => (
              <span key={i} className={cn("rounded-full px-2.5 py-1 font-bold", e.status === "sent" ? "bg-green-100 text-green-800" : "bg-blush-100 text-vio-800")} title={e.detail ?? ""}>
                {CHANNEL[e.channel] ?? e.channel}: {e.status === "sent" ? "arrivata ✓" : e.status === "skipped" || e.status === "not_configured" ? "non attiva" : `non arrivata${e.detail ? ` (${e.detail.slice(0, 40)})` : ""}`}
              </span>
            ))}
          </div>
          {r.response && <p className="mt-3 rounded-2xl bg-surface/80 px-3 py-2 text-sm text-vio-800">La tua risposta: {r.response}</p>}
          {replying === r.id ? (
            <div className="mt-3 space-y-2">
              {quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickReplies.map((q) => (
                    <button key={q} type="button" onClick={() => setText(q)} className="press rounded-full bg-blush-100 px-3 py-1.5 text-xs font-bold text-vio-800">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Scrivi a ${violaName}… (riceverà una notifica se l'ha abilitata)`} />
              <div className="flex gap-2">
                <Button size="sm" variant="soft" onClick={() => setReplying(null)}>
                  Annulla
                </Button>
                <Button
                  size="sm"
                  loading={pending}
                  onClick={() =>
                    run(async () => {
                      const res = await callAction(() => respondToRequest(r.id, text));
                      if (res.ok) {
                        setReplying(null);
                        setText("");
                      }
                      return res;
                    }, "Risposta inviata ♡")
                  }
                >
                  Invia risposta
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status !== "closed" && r.status !== "responded" && quickReplies.length > 0 && (
                <div className="w-full">
                  <p className="mb-1.5 text-xs font-extrabold tracking-wider text-ink-muted uppercase">Rispondi con un tocco</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Risposte rapide">
                    {quickReplies.slice(0, 4).map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => respondToRequest(r.id, q), `Inviato a ${violaName}: ${q}`)}
                        className="press min-h-10 rounded-full bg-blush-100 px-3.5 py-2 text-sm font-bold text-vio-800 ring-1 ring-blush-200 disabled:opacity-60"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {r.status === "new" && (
                <Button size="sm" variant="soft" onClick={() => run(() => setRequestStatus(r.id, "seen"))} loading={pending}>
                  <Eye className="size-4" /> Segna come vista
                </Button>
              )}
              <Button size="sm" onClick={() => setReplying(r.id)}>
                <MessageCircleReply className="size-4" /> {quickReplies.length ? "Scrivi tu" : "Rispondi"}
              </Button>
              {r.status !== "closed" ? (
                <Button size="sm" variant="ghost" onClick={() => run(() => setRequestStatus(r.id, "closed"))}>
                  <X className="size-4" /> Chiudi
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => run(() => setRequestStatus(r.id, "new"))}>
                  <Check className="size-4" /> Riapri
                </Button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
