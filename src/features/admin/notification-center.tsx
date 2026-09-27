"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";
import { findTelegramChats, sendTestNotification, selectTelegramChat } from "./notification-actions";

type Status = { state: "CONNECTED" | "DISCONNECTED" | "NOT CONFIGURED"; detail: string };
const CLS = { CONNECTED: "bg-green-100 text-green-800", DISCONNECTED: "bg-peach-100 text-wine-800", "NOT CONFIGURED": "bg-cream-200 text-ink-soft" };

export function ChannelCards({ status }: { status: { telegram: Status; webpush: Status; whatsapp: Status } }) {
  const [pending, start] = useTransition();
  const [last, setLast] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  const test = (c: "telegram" | "webpush" | "chain") =>
    start(async () => {
      const r = await sendTestNotification(c);
      if (!r.ok) return toast.show(r.error, "error");
      const txt = r.results.map((x) => `${x.channel}: ${x.status}${x.detail ? ` (${x.detail})` : ""}`).join(" · ");
      setLast(txt || "nessun canale configurato");
      toast.show(r.delivered ? "Notifica inviata ♡" : "Nessuna notifica partita", r.delivered ? "love" : "error");
      router.refresh();
    });

  const cards = [
    { key: "telegram" as const, name: "Telegram", s: status.telegram, test: true },
    { key: "webpush" as const, name: "Web Push", s: status.webpush, test: true },
    { key: "whatsapp" as const, name: "WhatsApp (link)", s: status.whatsapp, test: false },
  ];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.key} className="paper rounded-4xl p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-wine-900">{c.name}</h3>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-extrabold", CLS[c.s.state])}>{c.s.state}</span>
            </div>
            <p className="mt-1 min-h-10 text-sm text-ink-soft">{c.s.detail}</p>
            {c.test ? (
              <Button size="sm" variant="soft" className="mt-2" loading={pending} disabled={c.s.state === "NOT CONFIGURED"} onClick={() => test(c.key as "telegram" | "webpush")}>
                <Send className="size-4" /> Test Notification
              </Button>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">Non automatico: Viola tocca il pulsante e scrive lei. Sempre disponibile come ultima strada.</p>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => test("chain")} loading={pending}>
          <Send className="size-4" /> Prova la catena completa (come &quot;Ho bisogno di Adam&quot;)
        </Button>
        {last && <p className="text-sm font-bold text-wine-800">{last}</p>}
      </div>
    </div>
  );
}

export function TelegramChatFinder({ hasToken }: { hasToken: boolean }) {
  const [chats, setChats] = useState<{ id: string; name: string }[] | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!hasToken) return <p className="text-sm text-ink-soft">Prima aggiungi TELEGRAM_BOT_TOKEN nelle variabili d&apos;ambiente (vedi SETUP.md) e fai un nuovo deploy.</p>;
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
        <li>Apri Telegram e cerca il tuo bot.</li>
        <li>Premi &quot;Avvia&quot; (o scrivi /start).</li>
        <li>Torna qui e premi il pulsante.</li>
      </ol>
      <Button
        variant="soft"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await findTelegramChats();
            if (r.ok) {
              setChats(r.chats);
              if (!r.chats.length) toast.show("Nessuna chat trovata: scrivi /start al bot e riprova.", "info");
            } else toast.show(r.error, "error");
          })
        }
      >
        <Search className="size-4" /> Trova il mio chat ID
      </Button>
      {chats && chats.length > 0 && (
        <ul className="space-y-2">
          {chats.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-2">
              <span className="text-sm">
                <b>{c.name}</b> · <code>{c.id}</code>
              </span>
              <Button
                size="sm"
                onClick={() =>
                  start(async () => {
                    const r = await selectTelegramChat(c.id);
                    if (r.ok) {
                      toast.show("Chat collegata ♡ Ora prova una notifica.");
                      router.refresh();
                    } else toast.show(r.error, "error");
                  })
                }
              >
                Usa questa
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
