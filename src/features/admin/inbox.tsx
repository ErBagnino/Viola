"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Lock, MessageCircleReply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented, Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { MOODS } from "@/features/content/constants";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/dates";
import { deleteMessageAdmin, markMessageRead, replyToMessage } from "./inbox-actions";
import { callAction } from "@/utils/call-action";
import { WritingAssistant } from "@/features/ai-writing/writing-assistant";

export type InboxMessage = { id: string; body: string; category: string; isPrivate: boolean; readAt: string | null; reply: string | null; respondedAt: string | null; createdAt: string };
export type SharedJournal = { id: string; title: string | null; body: string; mood: number | null; createdAt: string };

const CAT: Record<string, string> = { thought: "💭 Pensiero", love: "💗 Ti amo", sad: "🌧️ Giù", need: "🫂 Ho bisogno", happy: "☀️ Felice", other: "✉️ Altro" };

export function Inbox({ messages, journal, tz, aiWriting = false, violaName = "Viola" }: { messages: InboxMessage[]; journal: SharedJournal[]; tz: string; aiWriting?: boolean; violaName?: string }) {
  const [tab, setTab] = useState<"messages" | "journal">("messages");
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) =>
    start(async () => {
      const r = await callAction(fn);
      if (r.ok) {
        if (ok) toast.show(ok);
        router.refresh();
      } else toast.show(r.error ?? "Errore", "error");
    });

  const list = filter === "unread" ? messages.filter((m) => !m.readAt) : messages;

  return (
    <div>
      <Segmented
        label="Sezione"
        value={tab}
        onChange={setTab}
        options={[
          { value: "messages", label: `Messaggi (${messages.filter((m) => !m.readAt).length} nuovi)` },
          { value: "journal", label: `Diario condiviso (${journal.length})` },
        ]}
      />
      {tab === "messages" ? (
        <>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant={filter === "all" ? "primary" : "soft"} onClick={() => setFilter("all")}>
              Tutti
            </Button>
            <Button size="sm" variant={filter === "unread" ? "primary" : "soft"} onClick={() => setFilter("unread")}>
              Da leggere
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {list.length === 0 && <EmptyState title="Nessun messaggio" />}
            {list.map((m) => (
              <li key={m.id} className={cn("paper rounded-4xl p-5", !m.readAt && "ring-2 ring-tint-300")}>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-ink-muted">{formatDateTime(m.createdAt, tz)}</span>
                  <span className="rounded-full bg-lilac-100 px-2 py-0.5 text-lilac-600">{CAT[m.category] ?? m.category}</span>
                  {m.isPrivate && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cream-200 px-2 py-0.5 text-ink-soft">
                      <Lock className="size-3" /> privato
                    </span>
                  )}
                  <span className={cn("rounded-full px-2 py-0.5", m.readAt ? "bg-green-100 text-green-800" : "bg-rouge-500 text-white")}>{m.readAt ? "letto" : "da leggere"}</span>
                  {m.respondedAt && <span className="rounded-full bg-tint-100 px-2 py-0.5 text-vio-800">risposto</span>}
                </div>
                <p className="mt-2 text-[17px] whitespace-pre-line text-vio-900">{m.body}</p>
                {m.reply && <p className="mt-3 rounded-2xl bg-surface/80 px-3 py-2 text-sm text-vio-800">La tua risposta: {m.reply}</p>}
                {replying === m.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="La tua risposta (la vedrà nella pagina Scrivi ad Adam)" aria-label="La tua risposta" />
                    {aiWriting && <WritingAssistant target="messages.reply" value={text} onApply={setText} messageId={m.id} messagePrivate={m.isPrivate} violaName={violaName} />}
                    <div className="flex gap-2">
                      <Button size="sm" variant="soft" onClick={() => setReplying(null)}>
                        Annulla
                      </Button>
                      <Button
                        size="sm"
                        loading={pending}
                        onClick={() =>
                          run(async () => {
                            const r = await callAction(() => replyToMessage(m.id, text));
                            if (r.ok) {
                              setReplying(null);
                              setText("");
                            }
                            return r;
                          }, "Risposta inviata ♡")
                        }
                      >
                        Invia
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setReplying(m.id)}>
                      <MessageCircleReply className="size-4" /> Rispondi
                    </Button>
                    <Button size="sm" variant="soft" onClick={() => run(() => markMessageRead(m.id, !m.readAt))}>
                      <Check className="size-4" /> {m.readAt ? "Segna da leggere" : "Segna letto"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Eliminare questo messaggio?") && run(() => deleteMessageAdmin(m.id), "Eliminato")} aria-label="Elimina">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="mt-4 space-y-3">
          {journal.length === 0 && <EmptyState title="Nessuna pagina condivisa" text="Le pagine private del diario non sono visibili (nemmeno all'admin)." />}
          {journal.map((j) => (
            <li key={j.id} className="paper rounded-4xl p-5">
              <p className="text-xs font-bold text-ink-muted">{formatDateTime(j.createdAt, tz)}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-vio-900">
                {j.mood ? `${MOODS[j.mood - 1]?.emoji} ` : ""}
                {j.title || "Senza titolo"}
              </h3>
              <p className="mt-1 whitespace-pre-line text-vio-900">{j.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
