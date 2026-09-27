"use client";

import { useState, useTransition } from "react";
import { Lock, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { HeartBurst } from "@/components/decor/burst";
import { formatDateTime } from "@/utils/dates";
import { deleteMessage, sendMessage } from "./actions";

const CATS = [
  ["thought", "💭 Un pensiero"],
  ["love", "💗 Ti amo"],
  ["sad", "🌧️ Sono giù"],
  ["need", "🫂 Ho bisogno"],
  ["happy", "☀️ Sono felice"],
  ["other", "✉️ Altro"],
] as const;

export type SentMessage = { id: string; body: string; category: string; isPrivate: boolean; createdAt: string; readAt: string | null; reply: string | null };

export function MessageComposer({ history, adamName, tz }: { history: SentMessage[]; adamName: string; tz: string }) {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATS)[number][0]>("thought");
  const [isPrivate, setPrivate] = useState(false);
  const [burst, setBurst] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const send = () =>
    start(async () => {
      const res = await sendMessage({ body, category, isPrivate });
      if (res.ok) {
        setBody("");
        setBurst(true);
        setTimeout(() => setBurst(false), 1300);
        toast.show(res.delivered ? `Inviato. ${adamName} riceve un avviso ♡` : `Inviato ♡ ${adamName} lo leggerà appena apre l'app.`);
      } else toast.show(res.error, "error");
    });

  return (
    <div>
      <HeartBurst show={burst} />
      <div className="paper rounded-4xl p-4">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {CATS.map(([k, l]) => (
            <Chip key={k} active={category === k} onClick={() => setCategory(k)}>
              {l}
            </Chip>
          ))}
        </div>
        <label htmlFor="msg" className="sr-only">
          Messaggio
        </label>
        <Textarea id="msg" rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder={`Scrivi ad ${adamName} tutto quello che stai pensando…`} className="mt-2" />
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-wine-800">
          <input type="checkbox" className="size-5 accent-wine-600" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />
          <Lock className="size-4" /> Non mostrare il testo nella notifica
        </label>
        <Button size="lg" className="mt-4 w-full" loading={pending} disabled={!body.trim()} onClick={send}>
          <Send className="size-5" /> Invia ad {adamName}
        </Button>
      </div>

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 px-1 font-sans text-xs font-extrabold tracking-widest text-wine-500 uppercase">I tuoi messaggi</h2>
          <ul className="space-y-3">
            {history.map((m) => (
              <li key={m.id} className="space-y-2">
                <div className="ml-auto max-w-[85%] rounded-3xl rounded-br-lg bg-wine-700 px-4 py-3 text-white">
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-1 flex items-center justify-end gap-2 text-[11px] text-white/60">
                    {formatDateTime(m.createdAt, tz)} · {m.readAt ? "letto ♡" : "inviato"}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-white/10"
                      aria-label="Elimina messaggio"
                      onClick={() => start(async () => void (await deleteMessage(m.id)))}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </p>
                </div>
                {m.reply && (
                  <div className="max-w-[85%] rounded-3xl rounded-bl-lg bg-white px-4 py-3 text-wine-900 shadow-soft">
                    <p className="font-hand text-lg text-wine-500">{adamName}</p>
                    <p className="whitespace-pre-line">{m.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
