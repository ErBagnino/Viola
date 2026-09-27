"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMemo } from "react";

export function NightSky() {
  const reduce = useReducedMotion();
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({ x: (i * 61) % 100, y: (i * 29) % 70, s: 1 + ((i * 13) % 3), d: (i % 9) * 0.4 })), []);
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden bg-gradient-to-b from-night-900 via-night-800 to-night-700" aria-hidden>
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s * 2, height: s.s * 2 }}
          animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3 + (i % 4), delay: s.d, repeat: Infinity }}
        />
      ))}
      <div className="absolute top-16 right-8 size-24 rounded-full bg-moon shadow-[0_0_80px_20px_rgba(246,231,193,0.35)]">
        <span className="absolute top-5 left-4 size-4 rounded-full bg-[#e9d5a4]" />
        <span className="absolute top-12 left-12 size-3 rounded-full bg-[#e9d5a4]" />
      </div>
    </div>
  );
}
