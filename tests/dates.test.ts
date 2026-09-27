import { describe, expect, it } from "vitest";
import { countdownParts, haversineKm, nextOccurrence, todayKey } from "@/utils/dates";

describe("dates", () => {
  it("splits a countdown into parts", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const c = countdownParts(new Date("2026-01-03T05:06:07Z"), now);
    expect(c).toMatchObject({ days: 2, hours: 5, minutes: 6, seconds: 7, done: false });
    expect(countdownParts(new Date("2025-01-01T00:00:00Z"), now).done).toBe(true);
  });

  it("moves yearly countdowns to the next occurrence", () => {
    const now = new Date("2026-09-27T10:00:00Z");
    expect(nextOccurrence("2020-03-10T09:00:00Z", true, now).toISOString()).toBe("2027-03-10T09:00:00.000Z");
    expect(nextOccurrence("2020-12-10T09:00:00Z", true, now).toISOString()).toBe("2026-12-10T09:00:00.000Z");
    expect(nextOccurrence("2020-12-10T09:00:00Z", false, now).getFullYear()).toBe(2020);
  });

  it("computes Torino ↔ Rosolina distance without GPS", () => {
    const km = haversineKm(45.0703, 7.6869, 45.0758, 12.2447);
    expect(km).toBeGreaterThan(340);
    expect(km).toBeLessThan(380);
  });

  it("uses the Rome day boundary", () => {
    // 23:30 UTC on Sep 27 is already Sep 28 in Rome (UTC+2)
    expect(todayKey("Europe/Rome", new Date("2026-09-27T23:30:00Z"))).toBe("2026-09-28");
  });
});
