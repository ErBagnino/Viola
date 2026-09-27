"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { MessageCircleHeart, Phone, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { HeartBurst } from "@/components/decor/burst";
import { whatsappLink } from "@/features/actions/registry";
import { requestAdam } from "./actions";

type Result = { delivered: boolean; throttled: boolean; channels: string[]; whatsappUrl: string | null; phoneUrl: string | null };

const CHANNEL_LABEL: Record<string, string> = { telegram: "Telegram", webpush: "notifica sul telefono" };

export function NeedAdam({
  button,
  placeholder,
  sentText,
  fallbackText,
  adamName,
  whatsappNumber,
  whatsappMessages,
  phoneUrl,
}: {
  button: string;
  placeholder: string;
  sentText: string;
  fallbackText: string;
  adamName: string;
  whatsappNumber: string | null;
  whatsappMessages: string[];
  phoneUrl: string | null;
}) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      if ("vibrate" in navigator) navigator.vibrate?.(40);
      const res = await requestAdam({ message });
      if (res.ok) setResult(res);
      else setError(res.error);
    });

  const contactButtons = (
    <div className="mt-5 grid gap-2.5">
      {whatsappNumber &&
        whatsappMessages.map((m) => (
          <a
            key={m}
            href={whatsappLink(whatsappNumber, m) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3.5 text-left font-bold text-wine-800 shadow-soft"
          >
            <MessageCircleHeart className="size-5 shrink-0 text-[#25a244]" /> {m}
          </a>
        ))}
      {phoneUrl && (
        <a href={phoneUrl} className="press btn-3d flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-wine-500 to-wine-700 px-4 py-4 font-extrabold text-white">
          <Phone className="size-5" /> Chiama {adamName}
        </a>
      )}
    </div>
  );

  return (
    <div>
      <HeartBurst show={Boolean(result?.delivered)} />
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="ask" exit={{ opacity: 0, scale: 0.96 }} className="flex flex-col items-center">
            <div className="relative my-6 grid place-items-center">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute size-56 rounded-full bg-rouge-400/25"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity }}
                  aria-hidden
                />
              ))}
              <motion.button
                type="button"
                onClick={send}
                disabled={pending}
                whileTap={{ scale: 0.94 }}
                className="relative grid size-56 place-items-center rounded-full bg-gradient-to-b from-rouge-400 to-rouge-600 p-6 text-center font-display text-2xl leading-tight font-semibold text-white shadow-glow disabled:opacity-80"
              >
                {pending ? <span className="animate-heartbeat text-5xl">♥</span> : button}
              </motion.button>
            </div>
            <label htmlFor="need-msg" className="sr-only">
              Messaggio per {adamName}
            </label>
            <Textarea id="need-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={placeholder} rows={3} maxLength={2000} className="w-full" />
            {error && (
              <p className="mt-3 rounded-xl bg-blush-100 px-3 py-2 text-sm font-bold text-wine-800" role="alert">
                {error}
              </p>
            )}
            <p className="mt-4 text-center text-sm text-ink-muted">Se preferisci, scrivigli o chiamalo direttamente:</p>
            <div className="w-full">{contactButtons}</div>
          </motion.div>
        ) : (
          <motion.div key="sent" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center" role="status">
            <div className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-b from-rouge-400 to-rouge-600 text-5xl text-white shadow-glow">♥</div>
            <p className="mt-5 font-display text-[1.7rem] leading-tight font-semibold text-wine-900">
              {result.throttled ? `${adamName} ha già ricevuto la tua richiesta pochi minuti fa. ♡` : result.delivered ? sentText : fallbackText}
            </p>
            {result.delivered && (
              <p className="mt-2 text-sm text-ink-soft">Avvisato tramite {result.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(" e ")}.</p>
            )}
            <div className="text-left">{contactButtons}</div>
            <Link href="/viola/calma/respira?via=1" className="press mt-4 inline-flex items-center gap-2 rounded-full bg-lilac-100 px-5 py-3 font-bold text-lilac-600">
              <Wind className="size-4" /> Mentre aspetti, respira con me
            </Link>
            <div className="mt-4">
              <Button variant="ghost" onClick={() => setResult(null)}>
                Torna indietro
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
