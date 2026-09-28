"use client";

import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { Lock, Mail } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { LetterView } from "@/features/letters/letter-view";
import type { PhotoSrc } from "@/components/ui/photo";
import { useNow } from "@/hooks/use-now";
import { countdownParts, formatDate } from "@/utils/dates";
import { openCapsule } from "./actions";
import { callAction } from "@/utils/call-action";
import { haptic } from "@/utils/haptics";

export type CapsuleItem = { id: string; title: string; teaser: string | null; unlockAt: string; unlocked: boolean; openedAt: string | null };

export function CapsuleList({ items, lockedText, readyText, signature }: { items: CapsuleItem[]; lockedText: string; readyText: string; signature: string }) {
  const [letter, setLetter] = useState<{ title: string; body: string; imageUrl: string | null; photo?: PhotoSrc | null } | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const now = useNow(30_000);

  const open = (c: CapsuleItem) =>
    start(async () => {
      const res = await callAction(() => openCapsule(c.id));
      if (res.ok) {
        haptic("success");
        setLetter(res);
      } else toast.show(res.error, "info");
    });

  return (
    <>
      <div className="space-y-3">
        {items.map((c, i) => {
          const unlocked = c.unlocked || (now ? new Date(c.unlockAt).getTime() <= now.getTime() : false);
          const left = now ? countdownParts(c.unlockAt, now) : null;
          return (
            <motion.button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => (unlocked ? open(c) : toast.show(lockedText, "info"))}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center gap-4 rounded-[1.75rem] p-4 text-left shadow-soft ${unlocked ? "bg-gradient-to-br from-blush-100 to-peach-100" : "paper opacity-90"}`}
            >
              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${unlocked ? "bg-wine-600 text-white" : "bg-tint-50 text-wine-400"}`}>
                {unlocked ? <Mail className="size-6" /> : <Lock className="size-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-semibold text-vio-900">{c.title}</span>
                {unlocked ? (
                  <span className="block text-sm font-bold text-vio-600">{c.openedAt ? "Aperta ♡ — rileggila" : readyText}</span>
                ) : (
                  <span className="block text-sm text-ink-soft">
                    {c.teaser || lockedText}
                    <span className="block text-xs font-bold text-vio-500">
                      Si apre il {formatDate(c.unlockAt, { day: "numeric", month: "long", year: "numeric" })}
                      {left && !left.done && ` · tra ${left.days > 0 ? `${left.days} giorni` : `${left.hours} ore`}`}
                    </span>
                  </span>
                )}
              </span>
              {unlocked && !c.openedAt && <span className="size-3 shrink-0 animate-heartbeat rounded-full bg-rouge-500" aria-label="Nuova" />}
            </motion.button>
          );
        })}
      </div>
      <Sheet open={Boolean(letter)} onClose={() => setLetter(null)}>
        {letter && <LetterView eyebrow="Una lettera dal passato" title={letter.title} body={letter.body} image={letter.photo ?? (letter.imageUrl ? { url: letter.imageUrl } : null)} signature={signature} />}
      </Sheet>
    </>
  );
}
