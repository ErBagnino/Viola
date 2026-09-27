import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateTasks, levelOf, readinessMessage, SEED_TITLES, TASKS, untouchedSeed, type ReadinessFacts } from "@/features/readiness/tasks";
import { parseSettings, settingsSchemas, type SettingsMap } from "@/features/settings/schema";

function settings(patch: Partial<{ [K in keyof SettingsMap]: Record<string, unknown> }> = {}): SettingsMap {
  return Object.fromEntries(Object.keys(settingsSchemas).map((k) => [k, parseSettings(k as keyof SettingsMap, patch[k as keyof SettingsMap] ?? {})])) as SettingsMap;
}

/** A brand-new project: database set up, nothing personal added yet. */
function emptyFacts(): ReadinessFacts {
  return {
    settings: settings(),
    savedSettings: new Set(),
    env: { ai: false, telegramToken: false, telegramChat: false, vapid: false, siteUrl: false, cronSecret: false, serviceRole: true },
    databaseUpdated: true,
    contact: { whatsapp: false },
    viola: { accounts: 0, pushDevices: 0 },
    adamPushDevices: 0,
    alertsTested: false,
    photos: { gallery: 0, random: 0, titledRandom: 0, adam: 0, breathing: 0, home: 0, surprises: 0, avatar: false },
    audio: 0,
    memories: { published: 0, withPhoto: 0 },
    dedications: { personal: 0, byCategory: {} },
    openWhen: { published: 6, untouchedSeed: 6 },
    countdowns: { meeting: null, anniversary: false, birthday: false },
    aiMemory: 0,
    aiModesTested: new Set(),
    quizActive: 0,
    phrases: { roulette: 8, question: 10 },
    manual: new Map(),
    memoryPairs: 6,
  };
}

/** Everything Adam can do has been done. */
function fullFacts(): ReadinessFacts {
  const manual = new Map(TASKS.filter((t) => t.manual).map((t) => [t.id, { state: "done" as const, doneAt: "2026-09-27T10:00:00Z" }]));
  return {
    ...emptyFacts(),
    settings: settings({ general: { togetherSince: "2025-02-14" } }),
    savedSettings: new Set(["ai", "ai_profile"]),
    env: { ai: true, telegramToken: true, telegramChat: true, vapid: true, siteUrl: true, cronSecret: true, serviceRole: true },
    contact: { whatsapp: true },
    viola: { accounts: 1, pushDevices: 1 },
    adamPushDevices: 1,
    alertsTested: true,
    photos: { gallery: 30, random: 12, titledRandom: 5, adam: 5, breathing: 4, home: 2, surprises: 3, avatar: true },
    audio: 3,
    memories: { published: 8, withPhoto: 4 },
    dedications: { personal: 7, byCategory: { sad: 1, fear: 1, miss_me: 2, love: 3 } },
    openWhen: { published: 6, untouchedSeed: 0 },
    countdowns: { meeting: { title: "Ci vediamo!", at: "2026-10-10T10:00:00Z", today: false }, anniversary: true, birthday: true },
    aiMemory: 6,
    aiModesTested: new Set(["general", "personal", "comfort"]),
    quizActive: 5,
    manual,
  };
}

describe("Completa Vio ♡ — task definitions", () => {
  it("have stable, unique, safe ids and a direct link", () => {
    const ids = TASKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TASKS) {
      expect(t.id).toMatch(/^[a-z0-9-]{2,60}$/); // same rule as the DB check
      expect(t.href.startsWith("/")).toBe(true);
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.description.length).toBeGreaterThan(10);
      expect(Boolean(t.manual) || Boolean(t.check)).toBe(true);
    }
  });

  it("never lets the safety-critical essentials be skipped", () => {
    for (const id of ["db-update", "viola-account", "whatsapp", "alerts", "next-meeting", "gallery", "first-memory"]) {
      const t = TASKS.find((x) => x.id === id)!;
      expect(t.priority).toBe("essential");
      expect(t.skippable ?? false).toBe(false);
    }
  });
});

describe("Completa Vio ♡ — evaluation", () => {
  it("a new project is 'Da completare', and every essential is listed", () => {
    const s = evaluateTasks(emptyFacts());
    expect(s.level).toBe("todo");
    expect(s.percent).toBeLessThan(25);
    const missing = s.tasks.filter((t) => !t.done && t.priority === "essential").map((t) => t.id);
    expect(missing).toEqual(expect.arrayContaining(["viola-account", "whatsapp", "alerts", "next-meeting", "gallery", "first-memory", "ai-key"]));
    expect(missing).not.toContain("db-update");
    expect(s.tasks.find((t) => t.id === "gallery")!.detail).toBe("servono ancora 10 foto");
    expect(s.tasks.find((t) => t.id === "gallery")!.progress).toEqual({ value: 0, target: 10 });
  });

  it("everything done → 100%, 'Pronta', and the final words", () => {
    const s = evaluateTasks(fullFacts());
    expect(s.tasks.filter((t) => !t.done).map((t) => t.id)).toEqual([]);
    expect(s.percent).toBe(100);
    expect(s.level).toBe("ready");
    expect(readinessMessage(s, "Viola")).toEqual({ title: "Vio ♡ è pronta. ♡", text: "Ora puoi lasciarla nelle mani di Viola. ♡" });
  });

  it("states are derived from the data: when the meeting passes, the task comes back", () => {
    const f = fullFacts();
    f.countdowns.meeting = null;
    const s = evaluateTasks(f);
    expect(s.tasks.find((t) => t.id === "next-meeting")!.done).toBe(false);
    expect(s.level).toBe("todo");
  });

  it("'Non mi serve' only works on skippable tasks; 'Fatto' only on manual ones", () => {
    const f = emptyFacts();
    f.manual.set("gallery", { state: "skipped", doneAt: "2026-09-27T10:00:00Z" });
    f.manual.set("whatsapp", { state: "done", doneAt: "2026-09-27T10:00:00Z" });
    f.manual.set("audio", { state: "skipped", doneAt: "2026-09-27T10:00:00Z" });
    f.manual.set("install-adam", { state: "done", doneAt: "2026-09-27T10:00:00Z" });
    const s = evaluateTasks(f);
    const get = (id: string) => s.tasks.find((t) => t.id === id)!;
    expect(get("gallery").done).toBe(false);
    expect(get("whatsapp").done).toBe(false);
    expect(get("audio")).toMatchObject({ done: true, skipped: true });
    expect(get("install-adam")).toMatchObject({ done: true, skipped: false, doneAt: "2026-09-27T10:00:00Z" });
  });

  it("only optional things left → 'È tutto pronto per lei'", () => {
    const f = fullFacts();
    f.photos.home = 0;
    f.audio = 1;
    const s = evaluateTasks(f);
    expect(s.level).toBe("ready");
    expect(s.percent).toBeLessThan(100);
    expect(readinessMessage(s, "Viola").title).toBe("È tutto pronto per lei. ♡");
  });

  it("levels and weights", () => {
    expect(levelOf(1, 0)).toBe("todo");
    expect(levelOf(0, 2)).toBe("almost");
    expect(levelOf(0, 0)).toBe("ready");
    const f = fullFacts();
    f.quizActive = 0;
    const s = evaluateTasks(f);
    expect(s.level).toBe("almost");
    expect(readinessMessage(s, "Viola").title).toBe("Il vostro piccolo mondo è quasi pronto. ♡");
  });

  it("missing dedication moments are named in Italian", () => {
    const f = fullFacts();
    f.dedications.byCategory = { love: 2 };
    const t = evaluateTasks(f).tasks.find((x) => x.id === "dedication-moments")!;
    expect(t.done).toBe(false);
    expect(t.detail).toBe("mancano: quando sei triste, quando hai paura, quando mi manchi");
    expect(t.progress).toEqual({ value: 1, target: 4 });
  });

  it("an older database is detected and asked to update", () => {
    const f = fullFacts();
    f.databaseUpdated = false;
    const s = evaluateTasks(f);
    expect(s.tasks.find((t) => t.id === "db-update")!.done).toBe(false);
    expect(s.level).toBe("todo");
  });
});

describe("starter examples", () => {
  const row = (title: string, created: string, updated = created) => ({ title, created_at: created, updated_at: updated });

  it("only untouched seed rows count as examples", () => {
    const rows = [
      row("Quando sei triste", "2026-09-01T10:00:00Z"),
      row("Quando hai paura", "2026-09-01T10:00:00Z", "2026-09-05T10:00:00Z"), // edited
      row("Promemoria", "2026-09-01T10:00:00Z"),
      row("La mia dedica", "2026-09-01T10:00:00Z"),
      row("Quando ti manco", "2026-09-10T10:00:00Z"), // written later, same title
    ];
    expect(untouchedSeed(rows, SEED_TITLES.dedications).map((r) => r.title)).toEqual(["Quando sei triste", "Promemoria"]);
  });

  it("the seed titles match supabase/seed.sql", () => {
    const seed = readFileSync(path.resolve(import.meta.dirname, "../supabase/seed.sql"), "utf8");
    for (const table of ["dedications", "open_when_cards"] as const) {
      const start = seed.indexOf(`insert into public.${table}`);
      const block = seed.slice(start, seed.indexOf(";\n", start));
      const titles = [...block.matchAll(/\n\s+\('((?:[^']|'')*)',/g)].map((m) => m[1].replace(/''/g, "'"));
      expect(titles).toEqual([...SEED_TITLES[table]]);
    }
  });
});
