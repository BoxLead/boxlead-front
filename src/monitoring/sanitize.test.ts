import { describe, expect, it } from "vitest";
import { MESSAGE_LIMIT, messageOf, RELEASE_LIMIT, ROUTE_LIMIT, sanitizeMessage, sanitizeRelease, sanitizeRoute } from "./sanitize";

describe("sanitizeMessage", () => {
  it("removes emails", () => {
    expect(sanitizeMessage("No user ana.perez+ventas@negocio.com.ar found")).toBe("No user [email] found");
  });

  it("removes runs of six or more digits, phones included", () => {
    expect(sanitizeMessage("Order 2000012345 for +54 9 11 1234-5678 failed")).toBe("Order [number] for [number] failed");
    expect(sanitizeMessage("Retry 3 of 12345")).toBe("Retry 3 of 12345");
  });

  it("removes anything that looks like a token", () => {
    expect(sanitizeMessage("Bad token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N")).toBe(
      "Bad token [token].[token].[token]",
    );
    expect(sanitizeMessage("hash 9f86d081884c7d659a2feaa0c55ad015")).toBe("hash [token]");
    expect(sanitizeMessage("key QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo/YWJjZGVm1+==")).toBe("key [token]");
  });

  it("keeps readable code names", () => {
    expect(sanitizeMessage("TypeError: Cannot read properties of undefined (reading 'conversationPreview')")).toBe(
      "TypeError: Cannot read properties of undefined (reading 'conversationPreview')",
    );
  });

  it("drops query strings and fragments from urls", () => {
    expect(sanitizeMessage("Failed https://api.boxlead.app/leads?status=NEW&email=x#top now")).toBe(
      "Failed https://api.boxlead.app/leads now",
    );
    expect(sanitizeMessage("Loading /app/inbox?id=abc&channel=MELI failed")).toBe("Loading /app/inbox failed");
  });

  it("replaces uuids", () => {
    expect(sanitizeMessage("Lead 0b0e0000-0000-4000-8000-000000000001 missing")).toBe("Lead :id missing");
  });

  it("collapses whitespace and caps the length", () => {
    expect(sanitizeMessage("  a\n\n b  ")).toBe("a b");
    expect(sanitizeMessage("x ".repeat(400))).toHaveLength(MESSAGE_LIMIT);
  });
});

describe("sanitizeRoute", () => {
  it("replaces uuids and numeric ids", () => {
    expect(sanitizeRoute("/app/leads/0b0e0000-0000-4000-8000-000000000001")).toBe("/app/leads/:id");
    expect(sanitizeRoute("/app/orders/42/items/7")).toBe("/app/orders/:id/items/:id");
    expect(sanitizeRoute("/app/items/MLA1234567890")).toBe("/app/items/:id");
  });

  it("keeps plain segments and drops queries", () => {
    expect(sanitizeRoute("/app/inbox?id=1#x")).toBe("/app/inbox");
    expect(sanitizeRoute("/")).toBe("/");
    expect(sanitizeRoute("")).toBe("/");
  });

  it("cleans segments that carry personal data and caps the length", () => {
    expect(sanitizeRoute("/app/ana@negocio.com")).toBe("/app/[email]");
    expect(sanitizeRoute(`/${"zona-".repeat(60)}`)).toHaveLength(ROUTE_LIMIT);
  });
});

describe("sanitizeRelease", () => {
  it("keeps safe characters and caps the length", () => {
    expect(sanitizeRelease("0.0.0-1a2b3c4d5e6f")).toBe("0.0.0-1a2b3c4d5e6f");
    expect(sanitizeRelease("<x> y")).toBe("xy");
    expect(sanitizeRelease("")).toBe("unknown");
    expect(sanitizeRelease("a".repeat(100))).toHaveLength(RELEASE_LIMIT);
  });
});

describe("messageOf", () => {
  it("reads errors, strings and primitives", () => {
    expect(messageOf(new TypeError("x is undefined"))).toBe("TypeError: x is undefined");
    expect(messageOf(new Error("plain"))).toBe("plain");
    expect(messageOf("text")).toBe("text");
    expect(messageOf(404)).toBe("404");
    expect(messageOf({ secret: "ana@negocio.com" })).toBe("Unknown error");
    expect(messageOf(null)).toBe("Unknown error");
  });
});
