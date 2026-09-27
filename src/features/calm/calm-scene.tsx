"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import type { CalmMode } from "./modes";

export { CALM_MODES, type CalmMode } from "./modes";

// ~6 breaths per minute: the rhythm of calm.
const CYCLE = 10;

export function CalmScene({ mode }: { mode: CalmMode }) {
  const reduce = useReducedMotion();
  const loop = { duration: CYCLE, repeat: Infinity, ease: "easeInOut" as const };
  const slow = reduce ? { duration: 0 } : loop;

  switch (mode) {
    case "heart":
      return (
        <motion.svg viewBox="-100 -100 200 200" className="size-[70vmin] max-w-sm" animate={reduce ? undefined : { scale: [0.8, 1.05, 0.8] }} transition={slow} aria-hidden>
          <defs>
            <radialGradient id="ch" cx="35%" cy="30%">
              <stop offset="0%" stopColor="#fbe1e1" />
              <stop offset="100%" stopColor="#a1203a" />
            </radialGradient>
          </defs>
          <path d="M0 62 C -46 30, -84 4, -78 -34 C -73 -64, -34 -76, 0 -44 C 34 -76, 73 -64, 78 -34 C 84 4, 46 30, 0 62 Z" fill="url(#ch)" />
        </motion.svg>
      );
    case "flower":
      return (
        <svg viewBox="-110 -110 220 220" className="size-[75vmin] max-w-sm" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <motion.ellipse
              key={i}
              cx={0}
              cy={-45}
              rx={22}
              ry={48}
              fill={i % 2 ? "#f4c2c6" : "#fbe1e1"}
              stroke="#fff"
              strokeWidth={2}
              style={{ originX: "0px", originY: "0px" }}
              initial={{ rotate: i * 45, scale: 0.6 }}
              animate={reduce ? { rotate: i * 45, scale: 0.9 } : { rotate: [i * 45, i * 45 + 20, i * 45], scale: [0.6, 1, 0.6] }}
              transition={slow}
            />
          ))}
          <circle r={20} fill="#e3262b" />
        </svg>
      );
    case "wave":
      return (
        <div className="relative h-[60vmin] w-full max-w-md overflow-hidden rounded-[3rem]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-x-[-50%] h-full rounded-[45%]"
              style={{ background: ["#7e1730", "#e3262b", "#f4a7ab"][i], opacity: 0.45, top: `${40 + i * 12}%` }}
              animate={reduce ? undefined : { rotate: [0, 360], y: [0, -20, 0] }}
              transition={{ duration: CYCLE * (1.4 + i * 0.4), repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>
      );
    case "star":
      return <StarField reduce={Boolean(reduce)} />;
    case "breath":
      return <BreathCircle reduce={Boolean(reduce)} />;
    case "orbit":
      return (
        <div className="relative size-[70vmin] max-w-sm" aria-hidden>
          <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-blush-200 to-wine-400 shadow-glow" />
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              className="absolute rounded-full border border-wine-200/60"
              style={{ inset: `${ring * 14}%` }}
              animate={reduce ? undefined : { rotate: ring % 2 ? -360 : 360 }}
              transition={{ duration: CYCLE * (2 + ring), repeat: Infinity, ease: "linear" }}
            >
              <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-wine-500 shadow" />
            </motion.div>
          ))}
        </div>
      );
    case "particles":
      return <Particles reduce={Boolean(reduce)} />;
    case "glow":
    default:
      return (
        <motion.div
          className="size-[60vmin] max-w-xs rounded-full"
          style={{ background: "radial-gradient(circle at 40% 35%, #fffaf0, #f6e7c1 40%, #f1b6b2 75%, transparent 76%)" }}
          animate={reduce ? undefined : { scale: [0.85, 1.05, 0.85], boxShadow: ["0 0 40px 10px #f6e7c1", "0 0 110px 40px #f8d3d0", "0 0 40px 10px #f6e7c1"] }}
          transition={slow}
          aria-hidden
        />
      );
  }
}

function StarField({ reduce }: { reduce: boolean }) {
  const stars = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({ x: (i * 53) % 100, y: (i * 37) % 100, s: 4 + ((i * 7) % 10), d: (i % 7) * 0.6 })),
    [],
  );
  return (
    <div className="relative h-[70vmin] w-full max-w-md" aria-hidden>
      {stars.map((st, i) => (
        <motion.span
          key={i}
          className="absolute text-peach-300"
          style={{ left: `${st.x}%`, top: `${st.y}%`, fontSize: st.s + 6 }}
          animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4 + (i % 4), delay: st.d, repeat: Infinity }}
        >
          ✦
        </motion.span>
      ))}
      <motion.span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl text-rouge-400"
        animate={reduce ? undefined : { rotate: [0, 20, 0], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: CYCLE, repeat: Infinity }}
      >
        ★
      </motion.span>
    </div>
  );
}

function BreathCircle({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative grid size-[70vmin] max-w-sm place-items-center" aria-hidden>
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-lilac-200 to-blush-200"
        animate={reduce ? undefined : { scale: [0.55, 1, 1, 0.55] }}
        transition={{ duration: CYCLE, times: [0, 0.4, 0.5, 1], repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.p
        className="relative font-display text-3xl font-semibold text-vio-800"
        animate={reduce ? undefined : { opacity: [1, 1, 0, 0, 1] }}
        transition={{ duration: CYCLE, times: [0, 0.4, 0.45, 0.95, 1], repeat: Infinity }}
      >
        dentro…
      </motion.p>
      <motion.p
        className="absolute font-display text-3xl font-semibold text-vio-800"
        animate={reduce ? undefined : { opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: CYCLE, times: [0, 0.45, 0.5, 0.95, 1], repeat: Infinity }}
      >
        …fuori
      </motion.p>
    </div>
  );
}

function Particles({ reduce }: { reduce: boolean }) {
  const [taps, setTaps] = useState<{ id: number; x: number; y: number }[]>([]);
  const base = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: (i * 41) % 100, y: (i * 67) % 100, d: (i % 9) * 0.7 })), []);
  return (
    <div
      className="relative h-[70vh] w-full max-w-md touch-none"
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const id = Date.now();
        setTaps((t) => [...t.slice(-12), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
        if ("vibrate" in navigator) navigator.vibrate?.(8);
      }}
      role="img"
      aria-label="Particelle luminose: tocca lo schermo"
    >
      {base.map((p, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-full bg-lilac-400/70"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          animate={reduce ? undefined : { y: [0, -30, 0], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 6 + (i % 5), delay: p.d, repeat: Infinity }}
        />
      ))}
      {taps.map((t) => (
        <motion.span
          key={t.id}
          className="pointer-events-none absolute text-2xl text-rouge-400"
          style={{ left: t.x - 12, top: t.y - 16 }}
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{ scale: 1.6, opacity: 0, y: -60 }}
          transition={{ duration: 1.6 }}
        >
          ♥
        </motion.span>
      ))}
    </div>
  );
}
