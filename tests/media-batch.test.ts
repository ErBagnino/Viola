import { describe, expect, it } from "vitest";
import { batchIdsSchema, batchPatchSchema, batchSentence, describePatch, snapshotKeys } from "@/features/admin/media-batch";
import { describeAudit } from "@/features/admin/audit-labels";

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("batch photo editing — patch", () => {
  it("only the chosen fields are in the patch (\"Non modificare\" = absent)", () => {
    const p = batchPatchSchema.parse({ category: "noi" });
    expect(p).toEqual({ category: "noi" });
    expect("taken_on" in p).toBe(false);
    expect("place" in p).toBe(false);
  });

  it("several fields at once; empty text clears the field", () => {
    const p = batchPatchSchema.parse({ category: " noi ", taken_on: "2024-09-04", place: "Torino", caption: "" });
    expect(p).toEqual({ category: "noi", taken_on: "2024-09-04", place: "Torino", caption: null });
  });

  it("refuses empty, unknown, manipulated or invalid values", () => {
    expect(batchPatchSchema.safeParse({}).success).toBe(false);
    expect(batchPatchSchema.safeParse({ path: "images/x" }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ created_by: id(1) }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ taken_on: "2024-02-31" }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ taken_on: "04/09/2024" }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ visibility: "public" }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ focus: "diagonale" }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ contexts_add: ["ovunque"] }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ place: "x".repeat(121) }).success).toBe(false);
    expect(batchPatchSchema.safeParse({ featured: "sì" }).success).toBe(false);
    const conflict = batchPatchSchema.safeParse({ tags_add: ["mare"], tags_remove: ["mare"] });
    expect(conflict.success).toBe(false);
    expect(conflict.error!.issues[0].message).toBe("Lo stesso tag non può essere aggiunto e tolto");
  });

  it("ids: valid uuids only, 1 to 1000, duplicates removed", () => {
    expect(batchIdsSchema.safeParse([]).success).toBe(false);
    expect(batchIdsSchema.safeParse(["1; drop table media"]).success).toBe(false);
    expect(batchIdsSchema.parse([id(1), id(1), id(2)])).toEqual([id(1), id(2)]);
    expect(batchIdsSchema.safeParse(Array.from({ length: 500 }, (_, i) => id(i))).success).toBe(true);
    expect(batchIdsSchema.safeParse(Array.from({ length: 1001 }, (_, i) => id(i))).success).toBe(false);
  });

  it("the confirmation describes exactly what will change", () => {
    expect(describePatch({ category: "noi" })).toEqual([{ label: "Categoria", value: "noi" }]);
    expect(describePatch({ taken_on: "2024-09-04", place: "Torino", visibility: "private", include_in_random: false, contexts_add: ["gallery"], caption: null })).toEqual([
      { label: "Data", value: "04/09/2024" },
      { label: "Luogo", value: "Torino" },
      { label: "Didascalia", value: "vuoto (lo tolgo)" },
      { label: "Visibilità", value: "Privata (solo tu)" },
      { label: "Nelle foto casuali", value: "No" },
      { label: "Fai comparire in", value: "Galleria" },
    ]);
  });

  it("undo keeps only the touched fields", () => {
    expect(snapshotKeys({ category: "noi" })).toEqual(["category"]);
    expect(snapshotKeys({ tags_add: ["a"], contexts_remove: ["breathing"] }).sort()).toEqual(["ai_avatar_enabled", "breathing_enabled", "contexts", "tags"]);
  });

  it("the log writes one sentence per batch", () => {
    expect(batchSentence(["category"], 12)).toBe("Hai modificato la categoria di 12 foto");
    expect(batchSentence(["category", "place", "taken_on"], 1)).toBe("Hai modificato la categoria, il luogo e la data di 1 foto");
    const row = (action: string, after: unknown) => ({ action, target_table: "media", target_id: null, before: null, after });
    expect(describeAudit(row("media.batch_update", { count: 12, fields: ["category"] })).text).toBe("Hai modificato la categoria di 12 foto");
    expect(describeAudit(row("media.batch_undo", { restored: 3 })).text).toBe("Hai annullato la modifica di 3 foto");
    expect(describeAudit(row("media.batch_delete", { count: 2 })).text).toBe("Hai eliminato 2 foto");
  });
});
