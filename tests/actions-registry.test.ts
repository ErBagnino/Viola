import { describe, expect, it } from "vitest";
import { actionHref, APP_ACTION_KEYS, phoneLink, safeUrl, whatsappLink } from "@/features/actions/registry";

const contact = { whatsappUrl: "https://wa.me/393330000000", phoneUrl: "tel:+393330000000" };

describe("app actions", () => {
  it("maps actions to destinations", () => {
    expect(actionHref("breathe", contact)).toBe("/viola/calma/respira");
    expect(actionHref("need_adam", contact)).toBe("/viola/adam");
    expect(actionHref("whatsapp", contact)).toBe(contact.whatsappUrl);
    expect(actionHref("call", contact)).toBe(contact.phoneUrl);
    expect(actionHref("none", contact)).toBeNull();
    expect(actionHref("does_not_exist", contact)).toBeNull();
  });

  it("hides contact actions when they are not configured (no fake UI)", () => {
    expect(actionHref("whatsapp", { whatsappUrl: null, phoneUrl: null })).toBeNull();
  });

  it("only allows safe custom links", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("//evil.example")).toBeNull();
    expect(safeUrl("data:text/html,x")).toBeNull();
    expect(safeUrl("/viola/noi")).toBe("/viola/noi");
    expect(safeUrl("https://example.com")).toBe("https://example.com");
    expect(actionHref("url", contact, "javascript:alert(1)")).toBeNull();
  });

  it("builds wa.me and tel links", () => {
    expect(whatsappLink("+39 333 000 0000", "Ciao ♡")).toBe("https://wa.me/393330000000?text=Ciao%20%E2%99%A1");
    expect(whatsappLink("")).toBeNull();
    expect(phoneLink("393330000000")).toBe("tel:+393330000000");
  });

  it("every action with a route points inside the app", () => {
    for (const k of APP_ACTION_KEYS) {
      const href = actionHref(k, contact, "/x");
      if (href) expect(href.startsWith("/") || href.startsWith("https://wa.me") || href.startsWith("tel:")).toBe(true);
    }
  });
});
