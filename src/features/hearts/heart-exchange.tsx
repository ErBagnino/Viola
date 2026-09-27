"use client";

import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartBurst } from "@/components/decor/burst";
import { useToast } from "@/components/ui/toast";
import { callAction } from "@/utils/call-action";
import { haptic } from "@/utils/haptics";
import { relativeTime } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { markHeartsSeen, sendHeart } from "./actions";

export type HeartState = { unseen: number; lastReceivedAt: string | null; lastSentAt: string | null };

/**
 * "Cuore a distanza": tap to say "ti penso". Shows the heart received from
 * the other person (and marks it seen), plus when you last sent one.
 */
export function HeartExchange({ state, otherName, title, compact }: { state: HeartState; otherName: string; title?: string; compact?: boolean }) {
  const [burst, setBurst] = useState(0);
  const [sentAt, setSentAt] = useState(state.lastSentAt);
  const [unseen, setUnseen] = useState(state.unseen);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const send = () =>
    start(async () => {
      haptic("heart");
      setBurst((b) => b + 1);
      if (unseen) void callAction(() => markHeartsSeen()).then(() => setUnseen(0));
      const res = await callAction(() => sendHeart());
      if (!res.ok) return toast.show(res.error, "error");
      setSentAt(new Date().toISOString());
      toast.show(`Cuore mandato a ${otherName} ♡`);
      router.refresh();
    });

  return (
    <section className={cn("paper relative overflow-hidden rounded-4xl", compact ? "p-4" : "p-5")} aria-label="Cuore a distanza">
      <HeartBurst key={burst} show={burst > 0} count={10} />
      <div className="flex items-center gap-4">
        <motion.button
          type="button"
          onClick={send}
          disabled={pending}
          whileTap={{ scale: 0.85 }}
          className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-b from-rouge-400 to-rouge-600 text-3xl text-white shadow-glow disabled:opacity-70"
          aria-label={`Manda un cuore a ${otherName}`}
        >
          <motion.span animate={unseen ? { scale: [1, 1.15, 1] } : undefined} transition={{ duration: 1.4, repeat: unseen ? Infinity : 0 }}>
            ♥
          </motion.span>
        </motion.button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">{title ?? "Cuore a distanza"}</p>
          {unseen > 0 && state.lastReceivedAt ? (
            <p className="mt-0.5 font-display text-lg leading-snug font-semibold text-vio-900">
              {otherName} ti ha mandato {unseen > 1 ? `${unseen} cuori` : "un cuore"} ♡
            </p>
          ) : (
            <p className="mt-0.5 font-display text-lg leading-snug font-semibold text-vio-900">Tocca il cuore per mandare un pensiero a {otherName}.</p>
          )}
          <p className="text-xs text-ink-muted" suppressHydrationWarning>
            {unseen > 0 && state.lastReceivedAt ? `${relativeTime(state.lastReceivedAt)} · rimandagliene uno` : sentAt ? `Il tuo ultimo cuore: ${relativeTime(sentAt)}` : "Nessuna parola, solo un pensiero."}
          </p>
        </div>
      </div>
    </section>
  );
}
