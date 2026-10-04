import { describe, expect, it } from "vitest";
import { loginPathFor, safeAppPath } from "./redirect";

describe("safeAppPath", () => {
  it.each([
    ["/app/leads", "/app/leads"],
    ["/app/inbox?channel=MELI&id=7", "/app/inbox?channel=MELI&id=7"],
    ["/app", "/app"],
  ])("accepts %s", (value, expected) => {
    expect(safeAppPath(value)).toBe(expected);
  });

  it.each([
    "https://evil.test/app/leads",
    "//evil.test/app/leads",
    "/\\evil.test",
    "/application",
    "/login",
    "javascript:alert(1)",
    "",
    null,
    42,
  ])("rejects %s", (value) => {
    expect(safeAppPath(value)).toBeNull();
  });
});

describe("loginPathFor", () => {
  it("carries a safe app path", () => {
    expect(loginPathFor("/app/leads?status=NEW")).toBe("/login?next=%2Fapp%2Fleads%3Fstatus%3DNEW");
  });

  it("drops anything else", () => {
    expect(loginPathFor("//evil.test")).toBe("/login");
  });
});
