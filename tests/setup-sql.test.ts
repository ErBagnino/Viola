import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain JS build script
import { buildSetupSql } from "../scripts/bundle-sql.mjs";

describe("supabase/setup.sql", () => {
  it("is in sync with migrations + seed (run `npm run db:bundle`)", () => {
    const current = readFileSync(path.resolve(import.meta.dirname, "../supabase/setup.sql"), "utf8");
    expect(current).toBe(buildSetupSql());
  });
});
