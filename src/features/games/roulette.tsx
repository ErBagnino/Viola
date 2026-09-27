"use client";

import { motion, useAnimate } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";

const COLORS = ["#f8d3d0", "#e2d6f3", "#fbd5bb", "#fdf6ec", "#f1b6b2", "#cbb8e8", "#f7bb93", "#fde9e7"];

export function Roulette({ items }: { items: string[] }) {
  const slices = items.slice(0, 8);
  const [scope, animate] = useAnimate();
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const n = slices.length;
  const step = 360 / n;

  const spin = async () => {
    if (spinning || n === 0) return;
    setSpinning(true);
    setResult(null);
    const target = Math.floor(Math.random() * n);
    // pointer is at the top: bring slice `target` centre to -90deg
    const final = angle + 360 * 5 + (360 - ((angle % 360) + target * step + step / 2)) % 360;
    await animate(scope.current, { rotate: final }, { duration: 3.6, ease: [0.15, 0.85, 0.25, 1] });
    setAngle(final);
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
          <circle r={26} fill="#82203d" stroke="#fff" strokeWidth={4} />
          <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="20">
            ♥
          </text>
        </motion.svg>
      </div>
      <div className="mt-6 min-h-24 text-center" aria-live="polite">
        {result && <p className="font-display text-2xl leading-snug font-semibold text-wine-900">{result}</p>}
      </div>
      <Button size="lg" className="w-full max-w-sm" onClick={spin} loading={spinning}>
        Gira la ruota
      </Button>
    </div>
  );
}
