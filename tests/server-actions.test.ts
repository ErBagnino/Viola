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
});
