"use client";

import { motion, useAnimate } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Final wheel rotation (degrees, clockwise) that brings the centre of slice
 * `target` under the pointer at the top, after at least five full turns.
 * Slice i spans [i·step − 90°, (i+1)·step − 90°] in wheel coordinates.
 */
export function finalAngle(current: number, target: number, n: number) {
  const step = 360 / n;
  const centre = target * step + step / 2;
  const base = current + 360 * 5;
  const need = (((-centre - base) % 360) + 360) % 360; // extra turn to land on the slice
  return base + need;
}

// a paper wheel: white, rose and red slices (text stays dark on all of them)
const COLORS = ["#fbe1e1", "#ffffff", "#f4c2c6", "#fdf3f1", "#eeb1b7", "#ffffff", "#f7d4d4", "#fdf3f1"];

export function Roulette({ items }: { items: string[] }) {
  const slices = items.slice(0, 8);
  const [scope, animate] = useAnimate();
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const reduce = useReducedMotion();
  const n = slices.length;
  const step = 360 / n;

  const spin = async () => {
    if (spinning || n === 0) return;
    setSpinning(true);
    setResult(null);
    const target = Math.floor(Math.random() * n);
    const final = finalAngle(angle, target, n);
    // "Riduci movimento": a short, gentle turn instead of five fast spins.
    await animate(scope.current, { rotate: reduce ? angle + ((final - angle) % 360) + 360 : final }, { duration: reduce ? 0.9 : 3.6, ease: [0.15, 0.85, 0.25, 1] });
    setAngle(reduce ? angle + ((final - angle) % 360) + 360 : final);
    setResult(slices[target]);
    setSpinning(false);
    if ("vibrate" in navigator) navigator.vibrate?.([30, 50, 30]);
    track("game_played", { game: "roulette" });
  };

  const r = 150;
  return (
    <div className="flex flex-col items-center">
      <HeartBurst show={Boolean(result)} />
      <div className="relative">
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-3xl text-rouge-500 drop-shadow" aria-hidden>
          ▼
        </span>
        <motion.svg ref={scope} viewBox="-160 -160 320 320" className="size-[min(82vw,20rem)] drop-shadow-xl" style={{ rotate: angle }}>
          {slices.map((s, i) => {
            const a0 = ((i * step - 90) * Math.PI) / 180;
            const a1 = (((i + 1) * step - 90) * Math.PI) / 180;
            const large = step > 180 ? 1 : 0;
            const mid = (((i + 0.5) * step - 90) * Math.PI) / 180;
            return (
              <g key={i}>
                <path d={`M0 0 L ${r * Math.cos(a0)} ${r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={3} />
                <text x={r * 0.62 * Math.cos(mid)} y={r * 0.62 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" fontSize="22" transform={`rotate(${(i + 0.5) * step} ${r * 0.62 * Math.cos(mid)} ${r * 0.62 * Math.sin(mid)})`}>
                  {["💗", "✨", "🌸", "⭐", "🍓", "🌙", "🦋", "🎀"][i % 8]}
                </text>
              </g>
            );
          })}
          <circle r={26} fill="#7e1730" stroke="#fff" strokeWidth={4} />
          <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="20">
            ♥
          </text>
        </motion.svg>
      </div>
      <div className="mt-6 min-h-24 text-center" aria-live="polite">
        {result && <p className="font-display text-2xl leading-snug font-semibold text-vio-900">{result}</p>}
      </div>
      <Button size="lg" className="w-full max-w-sm" onClick={spin} loading={spinning}>
        Gira la ruota
      </Button>
    </div>
  );
}
