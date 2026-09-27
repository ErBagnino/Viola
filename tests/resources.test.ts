import { describe, expect, it } from "vitest";
import { defaultsFor, getResource, parseUpdate, resourceBySlug, RESOURCES, RESOURCE_KEYS } from "@/features/admin/resources";
import { deriveMediaFlags } from "@/server/admin/crud";

describe("admin resource registry", () => {
  it("every resource has a table, slug, fields that exist in its schema", () => {
    const slugs = new Set<string>();
    for (const key of RESOURCE_KEYS) {
      const def = getResource(key)!;
      expect(def.table).toBeTruthy();
      expect(slugs.has(def.slug)).toBe(false);
      slugs.add(def.slug);
      for (const f of def.fields) {
        if (f.type === "options") continue;
        expect(Object.keys(def.schema.shape)).toContain(f.name);
      }
      expect(resourceBySlug(def.slug)?.key).toBe(key);
    }
  });

  it("updates validate ONLY the provided keys (no silent reset to defaults)", () => {
    const res = parseUpdate(RESOURCES.dedications, { is_published: false });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ is_published: false });
  });

  it("rejects invalid values", () => {
    expect(RESOURCES.dedications.schema.safeParse({ title: "" }).success).toBe(false);
    expect(RESOURCES.dedications.schema.safeParse({ title: "x", category: "hacker" }).success).toBe(false);
    expect(RESOURCES.comfort_actions.schema.safeParse({ title: "x", cta_url: "javascript:alert(1)" }).success).toBe(false);
    expect(RESOURCES.home_modules.schema.safeParse({ title: "x", url: "//evil.example" }).success).toBe(false);
    expect(RESOURCES.grounding_exercises.schema.safeParse({ title: "x", slug: "Bad Slug!", steps: [{ title: "a" }] }).success).toBe(false);
    expect(RESOURCES.countdowns.schema.safeParse({ title: "x", target_at: "not a date" }).success).toBe(false);
  });

  it("normalises empty optional values to null", () => {
    const r = RESOURCES.dedications.schema.parse({ title: "Ciao", media_id: "", publish_at: "", signature: "" });
    expect(r).toMatchObject({ media_id: null, publish_at: null, signature: null, is_published: true, category: "no_reason" });
  });

  it("quiz answers must exist", () => {
    const check = (RESOURCES.quiz_questions as { check?: (r: Record<string, unknown>) => string | null }).check!;
    expect(check({ options: ["a", "b"], correct_index: 2 })).toBeTruthy();
    expect(check({ options: ["a", "b"], correct_index: 1 })).toBeNull();
  });

  it("new records get sensible defaults", () => {
    expect(defaultsFor(RESOURCES.comfort_actions)).toMatchObject({ weight: 5, is_active: true, cta_action: "none" });
    expect(defaultsFor(RESOURCES.breathing_presets)).toMatchObject({ inhale_seconds: 4, hold_seconds: 4, exhale_seconds: 6 });
  });

  it("media flags follow the chosen contexts", () => {
    const data: Record<string, unknown> = { contexts: ["gallery", "breathing"] };
    deriveMediaFlags(RESOURCES.media, data);
    expect(data).toMatchObject({ breathing_enabled: true, ai_avatar_enabled: false });
  });
});

describe("quick actions (?nuovo=…)", async () => {
  const { RESOURCES, newValuesFor } = await import("@/features/admin/resources");
  type ResourceDef = import("@/features/admin/resources").ResourceDef;
  const { describeAudit } = await import("@/features/admin/audit-labels");

  it("named presets and badge values prefill the form; anything else is ignored", () => {
    expect(newValuesFor(RESOURCES.countdowns, "meeting")).toMatchObject({ kind: "meeting", recurring_yearly: false });
    expect(newValuesFor(RESOURCES.countdowns, "birthday")).toMatchObject({ kind: "birthday", recurring_yearly: true });
    expect(newValuesFor(RESOURCES.dedications, "sad")).toEqual({ category: "sad" });
    expect(newValuesFor(RESOURCES.dedications, "1")).toEqual({});
    expect(newValuesFor(RESOURCES.dedications, "is_published")).toEqual({});
    expect(newValuesFor(RESOURCES.dedications, "__proto__")).toEqual({});
    expect(newValuesFor(RESOURCES.countdowns, "__proto__")).toEqual({});
    expect(newValuesFor(RESOURCES.countdowns, "toString")).toEqual({});
    for (const def of Object.values(RESOURCES) as ResourceDef[])
      for (const values of Object.values(def.presets ?? {})) expect(def.schema.safeParse({ ...values, title: "x", target_at: "2026-10-10T10:00:00Z" }).success).toBe(true);
  });

  it("the audit log speaks Italian", () => {
    expect(describeAudit({ action: "create", target_table: "dedications", target_id: "x", before: null, after: { title: "Per te" } }).text).toBe("Hai aggiunto dedica: “Per te”");
    expect(describeAudit({ action: "settings", target_table: "app_settings", target_id: "contact", before: null, after: {} }).text).toBe("Hai cambiato le impostazioni: Contatti");
    expect(describeAudit({ action: "readiness.done", target_table: "readiness_checks", target_id: "install-adam", before: null, after: null }).text).toBe("Hai spuntato “Installa Vio ♡ sul tuo telefono”");
  });
});
