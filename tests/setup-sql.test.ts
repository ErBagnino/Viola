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
});
