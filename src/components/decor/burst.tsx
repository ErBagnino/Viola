"use client";

import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** A little celebration of hearts — used when something is completed. */
export function HeartBurst({ show, count = 14 }: { show: boolean; count?: number }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {show && !reduce && (
        <div className="pointer-events-none fixed inset-0 z-[90] grid place-items-center" aria-hidden>
          {Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * Math.PI * 2;
            const dist = 110 + (i % 3) * 40;
            return (
              <motion.span
                key={i}
                className="absolute text-2xl text-rouge-500"
                initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
                animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 1, opacity: 0, rotate: (i % 2 ? 1 : -1) * 30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              >
                {i % 4 === 0 ? "✦" : "♥"}
              </motion.span>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
