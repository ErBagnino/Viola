import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "@/features/auth/errors";
import { normalizeSupabaseUrl } from "@/lib/env";

describe("normalizeSupabaseUrl", () => {
  it("keeps only the project origin", () => {
    expect(normalizeSupabaseUrl("https://abcd.supabase.co")).toBe("https://abcd.supabase.co");
    expect(normalizeSupabaseUrl("https://abcd.supabase.co/")).toBe("https://abcd.supabase.co");
    expect(normalizeSupabaseUrl("  https://abcd.supabase.co/rest/v1/\n")).toBe("https://abcd.supabase.co");
    expect(normalizeSupabaseUrl("http://127.0.0.1:54321")).toBe("http://127.0.0.1:54321");
  });
  it("handles empty values", () => {
    expect(normalizeSupabaseUrl(undefined)).toBe("");
    expect(normalizeSupabaseUrl("   ")).toBe("");
  });
});

describe("signInErrorMessage", () => {
  const msg = (e: { code?: string; status?: number; message?: string }) =>
    signInErrorMessage({ code: e.code as never, status: e.status, message: e.message ?? "" });

  it("reports wrong credentials", () => {
    expect(msg({ code: "invalid_credentials", status: 400 })).toMatch(/non corrette/);
  });
  it("reports an unconfirmed account", () => {
    expect(msg({ code: "email_not_confirmed", status: 400 })).toMatch(/confermato/);
  });
  it("points at the key when Supabase rejects it", () => {
    expect(msg({ status: 401, message: "Invalid API key" })).toMatch(/PUBLISHABLE_KEY/);
  });
  it("points at the URL when Supabase is unreachable", () => {
    expect(msg({ status: 0, message: "fetch failed" })).toMatch(/SUPABASE_URL/);
    expect(msg({ status: 404, message: "Not Found" })).toMatch(/SUPABASE_URL/);
    expect(msg({ status: 503, message: "Service Unavailable" })).toMatch(/SUPABASE_URL/);
  });
  it("asks to wait on rate limits", () => {
    expect(msg({ code: "over_request_rate_limit", status: 429 })).toMatch(/minuto/);
  });
});
