import { cn } from "@/utils/cn";

/** 4-point Y2K sparkle — the little star motif from the app icon. */
export function Sparkle({ className, outline }: { className?: string; outline?: boolean }) {
  return (
    <svg viewBox="-10 -10 20 20" className={cn("size-4", className)} aria-hidden>
      <path
        d="M0 -9 C1.8 -1.8 1.8 -1.8 9 0 C1.8 1.8 1.8 1.8 0 9 C-1.8 1.8 -1.8 1.8 -9 0 C-1.8 -1.8 -1.8 -1.8 0 -9 Z"
        fill="currentColor"
        stroke={outline ? "currentColor" : "none"}
        strokeWidth={outline ? 1 : 0}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 5-point star with outline, like the icon accent. */
export function Star5({ className, fill = "#fff", stroke = "#da0e14" }: { className?: string; fill?: string; stroke?: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 9 : 4.1;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <svg viewBox="-11 -11 22 22" className={cn("size-5", className)} aria-hidden>
      <polygon points={pts.join(" ")} fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

/** The app's flower-of-hearts mark (same geometry family as the icon). */
export function HeartFlower({ className, color = "currentColor", strokeWidth = 38 }: { className?: string; color?: string; strokeWidth?: number }) {
  const s = 280;
  const w = s * 0.58;
  const heart = `M 0 0 C ${-w * 0.35} ${-s * 0.28}, ${-w} ${-s * 0.52}, ${-w * 0.78} ${-s * 0.84} C ${-w * 0.6} ${-s * 1.08}, ${-w * 0.14} ${-s * 1.06}, 0 ${-s * 0.8} C ${w * 0.14} ${-s * 1.06}, ${w * 0.6} ${-s * 1.08}, ${w * 0.78} ${-s * 0.84} C ${w} ${-s * 0.52}, ${w * 0.35} ${-s * 0.28}, 0 0 Z`;
  const small = 62;
  const sw2 = small * 0.62;
  const tiny = `M 0 0 C ${-sw2 * 0.35} ${-small * 0.28}, ${-sw2} ${-small * 0.52}, ${-sw2 * 0.78} ${-small * 0.84} C ${-sw2 * 0.6} ${-small * 1.08}, ${-sw2 * 0.14} ${-small * 1.06}, 0 ${-small * 0.8} C ${sw2 * 0.14} ${-small * 1.06}, ${sw2 * 0.6} ${-small * 1.08}, ${sw2 * 0.78} ${-small * 0.84} C ${sw2} ${-small * 0.52}, ${sw2 * 0.35} ${-small * 0.28}, 0 0 Z`;
  return (
    <svg viewBox="-420 -420 840 840" className={className} aria-hidden>
      <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
        {[0, 72, 144, 216, 288].map((deg) => (
          <path key={deg} d={heart} transform={`rotate(${deg}) translate(0 -88)`} />
        ))}
        <path d={tiny} transform="translate(0 30)" fill={color} strokeWidth={strokeWidth * 0.4} />
      </g>
    </svg>
  );
}
