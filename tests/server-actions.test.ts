import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A "use server" module may only export async functions (and types):
// anything else breaks the whole module at runtime in production.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("server action modules", () => {
  const src = path.resolve(import.meta.dirname, "../src");
  const actions = files(src).filter((f) => /^\s*["']use server["']/.test(readFileSync(f, "utf8")));

  it("exist", () => {
    expect(actions.length).toBeGreaterThan(5);
  });

  for (const f of actions) {
    it(`${path.relative(src, f)} only exports async functions`, () => {
      const bad = readFileSync(f, "utf8")
        .split("\n")
        .filter((l) => /^export\s/.test(l) && !/^export\s+(async\s+function|type\s|interface\s)/.test(l));
      expect(bad).toEqual([]);
    });
  }

  // Admin-only actions check the role themselves (never trust the page that calls them).
  const adminOnly = ["features/admin/media-batch-actions.ts", "features/admin/media-actions.ts", "features/admin/inbox-actions.ts", "features/admin/notification-actions.ts", "features/readiness/actions.ts", "features/settings/actions.ts"];
  // Admin API routes check the role in the handler too (the proxy is not enough).
  const apiDir = path.join(src, "app/api/admin");
  for (const f of files(apiDir).filter((x) => x.endsWith("route.ts"))) {
    it(`${path.relative(src, f)}: checks that the caller is Adam`, () => {
      expect(readFileSync(f, "utf8")).toMatch(/assertAdmin\(\)|role !== "admin"/);
    });
  }
  for (const rel of adminOnly) {
    it(`${rel}: every action checks that the caller is Adam`, () => {
      const code = readFileSync(path.join(src, rel), "utf8");
      const bodies = code.split(/^export async function /m).slice(1);
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) expect(body.split(/^}/m)[0]).toMatch(/assertAdmin\(\)/);
    });
  }
});
