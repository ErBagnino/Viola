import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { violaView, VIOLA_READ_RULES } from "@/server/viola-view";
import type { ServerSupabase } from "@/lib/supabase/server";

/** A fake query builder that records every call. */
function fakeClient() {
  const calls: string[] = [];
  const builder = (table: string) => {
    const b: Record<string, (...a: unknown[]) => unknown> = {};
    for (const m of ["select", "eq", "lte", "or", "order", "limit", "insert", "update", "delete", "in"]) {
      b[m] = (...a: unknown[]) => {
        calls.push(`${table}.${m}(${a.map((x) => JSON.stringify(x)).join(",")})`);
        return b;
      };
    }
    return b;
  };
  const client = { from: builder, rpc: (fn: string) => calls.push(`rpc(${fn})`) };
  return { client: client as unknown as ServerSupabase, calls };
}

describe("Vedi come Viola", () => {
  it("covers every table Viola reads through RLS rules", () => {
    const sql = readFileSync(path.resolve(import.meta.dirname, "../supabase/migrations/20260927000002_rls.sql"), "utf8");
    const block = sql.slice(sql.indexOf("select * from (values"), sql.indexOf(") as v(tbl, read_rule)"));
    const tables = [...block.matchAll(/\('([a-z_]+)',/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(10);
    for (const t of tables) expect(Object.keys(VIOLA_READ_RULES)).toContain(t);
  });

  it("adds Viola's filters to reads, never to writes", () => {
    const { client, calls } = fakeClient();
    const now = new Date("2026-09-27T10:00:00Z");
    const view = violaView(client, "adam-id", now);
    view.from("dedications").select("*").order("position");
    view.from("media").select("id", { count: "exact", head: true });
    view.from("messages").select("*");
    view.from("hearts").select("*");
    view.from("dedications").update({ title: "x" }).eq("id", "1");
    view.rpc("list_time_capsules");
    expect(calls).toEqual([
      'dedications.select("*")',
      'dedications.eq("is_published",true)',
      'dedications.or("publish_at.is.null,publish_at.lte.2026-09-27T10:00:00.000Z")',
      'dedications.order("position")',
      'media.select("id",{"count":"exact","head":true})',
      'media.eq("visibility","shared")',
      'messages.select("*")',
      'messages.eq("sender_id","adam-id")',
      'hearts.select("*")',
      'dedications.update({"title":"x"})',
      'dedications.eq("id","1")',
      "rpc(list_time_capsules)",
    ]);
  });
});
