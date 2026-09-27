"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { MessageCircleHeart, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/features/actions/registry";
import { pickAvoiding } from "@/utils/random";

export function RandomQuestions({ questions, whatsappNumber, adamName }: { questions: string[]; whatsappNumber: string | null; adamName: string }) {
  const items = questions.map((q, i) => ({ id: String(i), q }));
  const [recent, setRecent] = useState<string[]>([]);
  const [cur, setCur] = useState(items[0]);
  const next = () => {
    const n = pickAvoiding(items, [...recent, cur.id]);
    if (n) {
      setRecent((r) => [...r, cur.id].slice(-5));
      setCur(n);
    }
  };
  const wa = whatsappLink(whatsappNumber, `${cur?.q}\n\nLa mia risposta: `);
  if (!cur) return null;
  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={cur.id}
          initial={{ rotateX: 80, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: -80, opacity: 0 }}
          className="grid min-h-64 place-items-center rounded-[2rem] bg-gradient-to-br from-lilac-100 to-blush-100 p-8 text-center shadow-soft"
          style={{ transformPerspective: 800 }}
        >
          <p className="font-display text-[1.7rem] leading-snug font-semibold text-wine-900">{cur.q}</p>
        </motion.div>
      </AnimatePresence>
      <div className="mt-4 grid gap-3">
        <Button variant="white" size="lg" onClick={next}>
          <Shuffle className="size-5" /> Un&apos;altra domanda
        </Button>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="press btn-3d flex items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-4 font-extrabold text-white">
            <MessageCircleHeart className="size-5" /> Rispondi ad {adamName}
          </a>
        )}
      </div>
    </div>
  );
}
