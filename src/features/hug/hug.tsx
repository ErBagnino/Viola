"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { track } from "@/features/activity/track";

export function Hug({ lines, photoUrl, adamName }: { lines: string[]; photoUrl: string | null; adamName: string }) {
  const [i, setI] = useState(0);
  const [holding, setHolding] = useState(false);
  const [squeezes, setSqueezes] = useState(0);
  const vib = useRef<ReturnType<typeof setInterval> | null>(null);
  const seq = lines.length ? lines : ["Chiudi gli occhi un secondo.", "Immagina che ti stia abbracciando."];

  // stop the vibration pattern if the page is left while holding
  useEffect(
    () => () => {
      if (vib.current) clearInterval(vib.current);
    },
    [],
  );

  useEffect(() => {
    if (i >= seq.length - 1) return;
    const t = setTimeout(() => setI((v) => v + 1), 3800);
    return () => clearTimeout(t);
  }, [i, seq.length]);

  const startHold = () => {
    setHolding(true);
    if ("vibrate" in navigator) {
      navigator.vibrate?.([60, 120, 60]);
      vib.current = setInterval(() => navigator.vibrate?.([60, 120, 60]), 1000);
    }
  };
  const endHold = () => {
    if (!holding) return;
    setHolding(false);
    setSqueezes((s) => s + 1);
    if (vib.current) clearInterval(vib.current);
    if (squeezes === 0) track("hug");
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-wine-900 via-wine-800 to-rouge-600 px-6 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] text-white">
      <h1 className="sr-only">Un abbraccio da {adamName}</h1>
      <div className="flex w-full max-w-md justify-start">
        <Link href="/viola" className="press grid size-11 place-items-center rounded-2xl bg-white/10" aria-label="Chiudi">
          <X className="size-5" />
        </Link>
      </div>

      <div className="relative grid place-items-center">
        {[0, 1, 2, 3].map((k) => (
          <motion.span
            key={k}
            className="absolute size-64 rounded-full border border-blush-200/40"
            animate={{ scale: holding ? [1, 1.25] : [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: holding ? 1 : 3, delay: k * 0.7, repeat: Infinity }}
            aria-hidden
          />
        ))}
        <motion.button
          type="button"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onKeyDown={(e) => e.key === " " && startHold()}
          onKeyUp={(e) => e.key === " " && endHold()}
          animate={{ scale: holding ? 1.18 : [1, 1.06, 1] }}
          transition={holding ? { type: "spring", damping: 10 } : { duration: 1.6, repeat: Infinity }}
          className="relative grid size-56 touch-none place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blush-200 to-rouge-400 shadow-glow select-none"
          aria-label="Tieni premuto per un abbraccio"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={adamName} className="h-full w-full object-cover opacity-90" draggable={false} />
          ) : (
            <span className="text-8xl">♥</span>
          )}
        </motion.button>
      </div>

      <div className="min-h-40 max-w-sm text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={holding ? "hold" : i}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className="font-display text-[1.9rem] leading-tight font-semibold"
          >
            {holding ? "Stretta stretta. ♡" : seq[i]}
          </motion.p>
        </AnimatePresence>
        <p className="mt-4 text-sm text-white/60">{squeezes > 0 ? `Abbracci ricevuti: ${squeezes} ♡` : "Tieni premuto il cuore per stringerlo."}</p>
      </div>
    </div>
  );
}
