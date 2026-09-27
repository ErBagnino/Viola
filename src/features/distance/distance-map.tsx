"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Two cities, an animated dashed line and hearts travelling between them (no GPS). */
export function DistanceMap({ from, to, km, fromLabel, toLabel }: { from: string; to: string; km: number; fromLabel?: string; toLabel?: string }) {
  const reduce = useReducedMotion();
  const path = "M 60 170 C 150 40, 290 40, 380 150";
  return (
    <div className="paper relative overflow-hidden rounded-4xl p-4">
      <svg viewBox="0 0 440 240" className="w-full" role="img" aria-label={`${from} e ${to}: ${km} chilometri`}>
        <defs>
          <linearGradient id="dm-line" x1="0" x2="1">
            <stop offset="0" stopColor="#c0455f" />
            <stop offset="1" stopColor="#e3262b" />
          </linearGradient>
        </defs>
        {/* soft hills */}
        <path d="M0 210 C 80 180, 140 200, 220 190 C 300 180, 360 200, 440 185 L 440 240 L 0 240 Z" style={{ fill: "var(--color-blush-100)" }} />
        <path d="M0 225 C 100 205, 180 225, 260 212 C 340 200, 400 222, 440 210 L 440 240 L 0 240 Z" style={{ fill: "var(--color-tint-100)" }} />
        <motion.path
          d={path}
          fill="none"
          stroke="url(#dm-line)"
          strokeWidth={4}
          strokeDasharray="10 10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1, strokeDashoffset: reduce ? 0 : [0, -40] }}
          transition={{ pathLength: { duration: 1.6 }, strokeDashoffset: { duration: 2, repeat: Infinity, ease: "linear" } }}
        />
        {!reduce &&
          [0, 1, 2].map((i) => (
            <text key={i} fontSize="20" fill="#da0e14" textAnchor="middle" dominantBaseline="middle" visibility="hidden">
              ♥
              <set attributeName="visibility" to="visible" begin={`${i * 1.5}s`} />
              <animateMotion dur="4.5s" begin={`${i * 1.5}s`} repeatCount="indefinite" path={path} />
            </text>
          ))}
        <g>
          <circle cx="60" cy="170" r="14" fill="#7e1730" />
          <circle cx="60" cy="170" r="24" fill="#7e1730" opacity="0.18" />
          <text x="60" y="205" textAnchor="middle" fontSize="16" fontWeight="800" style={{ fill: "var(--color-ink)" }}>
            {from}
          </text>
          {fromLabel && (
            <text x="60" y="222" textAnchor="middle" fontSize="12" style={{ fill: "var(--color-ink-soft)" }}>
              {fromLabel}
            </text>
          )}
        </g>
        <g>
          <circle cx="380" cy="150" r="14" fill="#da0e14" />
          <circle cx="380" cy="150" r="24" fill="#da0e14" opacity="0.18" />
          <text x="380" y="185" textAnchor="middle" fontSize="16" fontWeight="800" style={{ fill: "var(--color-ink)" }}>
            {to}
          </text>
          {toLabel && (
            <text x="380" y="202" textAnchor="middle" fontSize="12" style={{ fill: "var(--color-ink-soft)" }}>
              {toLabel}
            </text>
          )}
        </g>
      </svg>
      <p className="text-center font-display text-3xl font-semibold text-vio-900">{km} km</p>
      <p className="text-center text-sm text-ink-soft">di strada, zero di distanza nel cuore</p>
    </div>
  );
}
