import { describe, expect, it } from "vitest";
import { cycleSeconds, phaseList, stateAt, totalSeconds } from "@/features/breathing/cycle";

const p = { inhale: 4, hold: 4, exhale: 6, holdAfter: 0, rounds: 2 };

describe("breathing cycle", () => {
  it("skips zero-length phases", () => {
    expect(phaseList({ ...p, hold: 0 }).map((x) => x.phase)).toEqual(["inhale", "exhale"]);
    expect(phaseList({ ...p, holdAfter: 2 }).map((x) => x.phase)).toEqual(["inhale", "hold", "exhale", "rest"]);
  });

  it("computes cycle and total length", () => {
    expect(cycleSeconds(p)).toBe(14);
    expect(totalSeconds(p)).toBe(28);
    expect(totalSeconds({ ...p, rounds: null })).toBe(Infinity);
  });

  it("follows inhale → hold → exhale with the right expansion", () => {
    expect(stateAt(p, 0)).toMatchObject({ phase: "inhale", round: 0, expansion: 0 });
    expect(stateAt(p, 2).expansion).toBeCloseTo(0.5, 5);
    expect(stateAt(p, 5)).toMatchObject({ phase: "hold", expansion: 1, secondsLeft: 3 });
    const exhaling = stateAt(p, 11);
    expect(exhaling.phase).toBe("exhale");
    expect(exhaling.expansion).toBeGreaterThan(0);
    expect(exhaling.expansion).toBeLessThan(1);
    expect(stateAt(p, 15)).toMatchObject({ phase: "inhale", round: 1 });
  });

  it("ends after the configured rounds, never for free sessions", () => {
    expect(stateAt(p, 28).done).toBe(true);
    expect(stateAt({ ...p, rounds: null }, 10_000).done).toBe(false);
  });
});
