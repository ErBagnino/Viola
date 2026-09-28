import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain JS build script
import { buildSetupSql, buildUpdateSql } from "../scripts/bundle-sql.mjs";

describe("supabase/setup.sql", () => {
  it("is in sync with migrations + seed (run `npm run db:bundle`)", () => {
    const current = readFileSync(path.resolve(import.meta.dirname, "../supabase/setup.sql"), "utf8");
    expect(current).toBe(buildSetupSql());
  });

  it("update.sql is in sync with the migrations added after the first release", () => {
    const current = readFileSync(path.resolve(import.meta.dirname, "../supabase/update.sql"), "utf8");
    expect(current).toBe(buildUpdateSql());
    expect(current).toContain("20260928000001_hardening.sql");
  });

  it("never deletes data: update.sql has no destructive statements, setup.sql refuses an existing database", () => {
    const update = readFileSync(path.resolve(import.meta.dirname, "../supabase/update.sql"), "utf8");
    // top-level statements only (function bodies are between $$ … $$)
    const topLevel = update.split("$$").filter((_, i) => i % 2 === 0).join("\n");
    for (const bad of [/drop\s+table/i, /truncate/i, /drop\s+column/i, /drop\s+schema/i, /^\s*delete\s+from/im, /^\s*update\s+public\./im]) {
      expect(topLevel).not.toMatch(bad);
    }
    const setup = readFileSync(path.resolve(import.meta.dirname, "../supabase/setup.sql"), "utf8");
    const guard = setup.indexOf("to_regclass('public.media') is not null");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(setup.indexOf("create table"));
  });
});
