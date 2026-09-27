import { describe, expect, it } from "vitest";
import { pickAvoiding, seededIndex, seededRandom, shuffle, weightedPick } from "@/utils/random";

describe("random comfort engine helpers", () => {
  it("weightedPick respects weights and skips zero-weight items", () => {
    const items = [
      { id: "a", weight: 0 },
      { id: "b", weight: 1 },
      { id: "c", weight: 9 },
    ];
    const rand = seededRandom("weights");
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 5000; i++) counts[weightedPick(items, rand)!.id]++;
    expect(counts.a).toBe(0);
    expect(counts.c).toBeGreaterThan(counts.b * 5);
  });

  it("weightedPick returns null for an empty or all-zero pool", () => {
    expect(weightedPick([])).toBeNull();
    expect(weightedPick([{ weight: 0 }])).toBeNull();
  });

  it("pickAvoiding never repeats the most recent item", () => {
    const items = ["1", "2", "3"].map((id) => ({ id, weight: 1 }));
    const rand = seededRandom("avoid");
    let last = "1";
    for (let i = 0; i < 200; i++) {
      const p = pickAvoiding(items, [last], rand)!;
      expect(p.id).not.toBe(last);
      last = p.id;
    }
  });

  it("pickAvoiding still works when every item is recent", () => {
    const items = [{ id: "only", weight: 1 }];
    expect(pickAvoiding(items, ["only"])?.id).toBe("only");
  });

  it("seeded helpers are deterministic", () => {
    expect(seededIndex("2026-09-27", 10)).toBe(seededIndex("2026-09-27", 10));
    const a = seededRandom("x");
    const b = seededRandom("x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(shuffle([1, 2, 3, 4, 5], seededRandom("s"))).toEqual(shuffle([1, 2, 3, 4, 5], seededRandom("s")));
  });
});
