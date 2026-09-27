import { describe, expect, it } from "vitest";
import { countdownParts, haversineKm, lastDaysKeys, occurrenceOf, todayKey } from "@/utils/dates";

describe("dates", () => {
  it("splits a countdown into parts", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const c = countdownParts(new Date("2026-01-03T05:06:07Z"), now);
    expect(c).toMatchObject({ days: 2, hours: 5, minutes: 6, seconds: 7, done: false });
    expect(countdownParts(new Date("2025-01-01T00:00:00Z"), now).done).toBe(true);
  });

  it("moves yearly countdowns to the next occurrence", () => {
    const now = new Date("2026-09-27T10:00:00Z");
    expect(occurrenceOf("2020-03-10T09:00:00Z", true, now).at.toISOString()).toBe("2027-03-10T09:00:00.000Z");
    expect(occurrenceOf("2020-12-10T09:00:00Z", true, now).at.toISOString()).toBe("2026-12-10T09:00:00.000Z");
    const once = occurrenceOf("2020-12-10T09:00:00Z", false, now);
    expect(once.at.getFullYear()).toBe(2020);
    expect(once.past).toBe(true);
  });

  it("keeps the whole day of a date as 'today' (in Rome time)", () => {
    // birthday stored at local midnight (22:00 UTC the day before); it is the afternoon of that day
    const birthday = "1999-09-26T22:00:00Z"; // 27 Sep 00:00 in Rome
    const afternoon = new Date("2026-09-27T14:00:00Z");
    const r = occurrenceOf(birthday, true, afternoon, "Europe/Rome");
    expect(r.isToday).toBe(true);
    expect(r.past).toBe(false);
    // a one-off meeting earlier today is still "today", not "already happened"
    const meeting = occurrenceOf("2026-09-27T08:00:00Z", false, afternoon, "Europe/Rome");
    expect(meeting).toMatchObject({ isToday: true, past: false });
    // the day after it is over
    expect(occurrenceOf("2026-09-26T08:00:00Z", false, afternoon, "Europe/Rome").past).toBe(true);
  });

  it("builds day keys in the couple's time zone", () => {
    const keys = lastDaysKeys(2, new Date("2026-09-27T23:30:00Z"), "Europe/Rome");
    expect(keys).toEqual(["2026-09-27", "2026-09-28"]);
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
