"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { Sparkle } from "./stars";

/** Soft decorative hearts & sparkles drifting in the background. */
export function FloatingHearts({ count = 10, className, tone = "light" }: { count?: number; className?: string; tone?: "light" | "night" }) {
  const reduce = useReducedMotion();
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 97) % 100,
        size: 10 + ((i * 37) % 18),
        delay: (i * 1.3) % 8,
        duration: 12 + ((i * 7) % 10),
        kind: i % 3 === 0 ? "sparkle" : "heart",
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div className={`pointer-events-none fixed inset-0 -z-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      {items.map((it) => (
        <motion.div
          key={it.id}
          className="absolute bottom-[-40px]"
          style={{ left: `${it.left}%` }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: "-110vh", opacity: [0, 0.7, 0.7, 0], x: [0, 14, -10, 6] }}
          transition={{ duration: it.duration, delay: it.delay, repeat: Infinity, ease: "linear" }}
        >
          {it.kind === "heart" ? (
            <span
              style={{ fontSize: it.size }}
              className={tone === "night" ? "text-blush-300/40" : "text-blush-300/70"}
            >
              ♥
            </span>
          ) : (
            <Sparkle className={tone === "night" ? "text-moon/60" : "text-lilac-300"} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
