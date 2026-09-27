import { describe, expect, it } from "vitest";
import { finalAngle } from "@/features/games/roulette";

// The pointer is at the top. After rotating the wheel by R degrees clockwise,
// the centre of slice i sits at (i + 0.5)·step − 90 + R; it must be −90 (mod 360).
const landsOn = (R: number, n: number) => {
  const step = 360 / n;
  for (let i = 0; i < n; i++) {
    const at = ((((i + 0.5) * step + R) % 360) + 360) % 360;
    if (Math.abs(at) < 1e-6 || Math.abs(at - 360) < 1e-6) return i;
  }
  return -1;
};

describe("roulette", () => {
  it("always lands the chosen slice under the pointer, after at least five turns", () => {
    for (const n of [2, 3, 5, 8]) {
      let angle = 0;
      for (let spin = 0; spin < 20; spin++) {
        const target = (spin * 7 + n) % n;
        const next = finalAngle(angle, target, n);
        expect(landsOn(next, n)).toBe(target);
        expect(next - angle).toBeGreaterThanOrEqual(360 * 5);
        expect(next - angle).toBeLessThan(360 * 6);
        angle = next;
      }
    }
  });
});
