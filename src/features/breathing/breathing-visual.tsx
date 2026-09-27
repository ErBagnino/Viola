"use client";

import { useId } from "react";
import type { BreathingVisual as Visual } from "./types";

const HEART = "M0 62 C -46 30, -84 4, -78 -34 C -73 -64, -34 -76, 0 -44 C 34 -76, 73 -64, 78 -34 C 84 4, 46 30, 0 62 Z";

function starPath(R: number, inner = 0.48) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

/**
 * The central breathing shape. `expansion` 0..1 drives its size; an optional
 * photo lives inside the shape and is blurred by `blur` (px).
 */
export function BreathingVisual({
  visual,
  expansion,
  photoUrl,
  blur = 0,
  photoOpacity = 1,
}: {
  visual: Visual;
  expansion: number;
  photoUrl?: string | null;
  blur?: number;
  photoOpacity?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const scale = 0.52 + expansion * 0.48;
  const clip = `clip-${uid}`;
  const blurId = `blur-${uid}`;
  const grad = `grad-${uid}`;
  const glow = `glow-${uid}`;

  const shapeFor = (v: Visual) => {
    switch (v) {
      case "heart":
        return <path d={HEART} />;
      case "star":
        return <path d={starPath(84)} />;
      default:
        return <circle r={78} />;
    }
  };

  const clipShape = visual === "heart" || visual === "star" ? visual : "sphere";

  return (
    <svg viewBox="-110 -110 220 220" className="h-full w-full overflow-visible" role="img" aria-label="Forma che respira">
      <defs>
        <radialGradient id={grad} cx="35%" cy="30%" r="80%">
          {visual === "orb" ? (
            <>
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="60%" stopColor="#f6e7c1" />
              <stop offset="100%" stopColor="#e7c98c" />
            </>
          ) : visual === "star" ? (
            <>
              <stop offset="0%" stopColor="#fff4f2" />
              <stop offset="100%" stopColor="#e3262b" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#fbe1e1" />
              <stop offset="55%" stopColor="#e06a72" />
              <stop offset="100%" stopColor="#7e1730" />
            </>
          )}
        </radialGradient>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="#f4a7ab" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f4a7ab" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clip}>{shapeFor(clipShape as Visual)}</clipPath>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>

      {/* soft halo */}
      <circle r={100} fill={`url(#${glow})`} opacity={0.35 + expansion * 0.5} transform={`scale(${0.7 + expansion * 0.4})`} />

      {visual === "wave" &&
        [0, 1, 2].map((i) => (
          <circle
            key={i}
            r={40 + i * 22 + expansion * 26}
            fill="none"
            stroke="#c0455f"
            strokeOpacity={0.45 - i * 0.12}
            strokeWidth={3}
          />
        ))}

      {visual === "flower" && (
        <g transform={`rotate(${expansion * 30})`}>
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse
              key={i}
              cx={0}
              cy={-30 - expansion * 22}
              rx={24 + expansion * 6}
              ry={42 + expansion * 10}
              fill="#f9dcdc"
              stroke="#e3262b"
              strokeWidth={2}
              opacity={0.85}
              transform={`rotate(${i * 60})`}
            />
          ))}
        </g>
      )}

      <g transform={`scale(${visual === "flower" ? 0.55 + expansion * 0.2 : scale})`}>
        {photoUrl ? (
          <>
            <g clipPath={`url(#${clip})`}>
              <rect x={-110} y={-110} width={220} height={220} fill={`url(#${grad})`} />
              <image
                href={photoUrl}
                x={-90}
                y={-90}
                width={180}
                height={180}
                preserveAspectRatio="xMidYMid slice"
                filter={blur > 0.2 ? `url(#${blurId})` : undefined}
                opacity={photoOpacity}
              />
            </g>
            <g fill="none" stroke="#fff" strokeWidth={4} opacity={0.9}>
              {shapeFor(clipShape as Visual)}
            </g>
          </>
        ) : (
          <g fill={`url(#${grad})`} stroke="#fff" strokeOpacity={0.7} strokeWidth={3}>
            {shapeFor(visual === "wave" || visual === "flower" ? "sphere" : visual)}
          </g>
        )}
        {!photoUrl && (visual === "sphere" || visual === "orb") && (
          <ellipse cx={-26} cy={-30} rx={22} ry={12} fill="#fff" opacity={0.45} transform="rotate(-30)" />
        )}
      </g>
    </svg>
  );
}
