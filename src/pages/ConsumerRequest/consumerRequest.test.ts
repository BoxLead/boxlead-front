import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import { fallbackMailto, isRateLimited, isReceipt } from "./consumerRequest";

describe("consumer requests", () => {
  it("accepts only a receipt with a code", () => {
    expect(isReceipt({ code: "BX-7KX2M9", createdAt: "2026-10-25T14:00:00Z" })).toBe(true);
    expect(isReceipt({ code: "" })).toBe(false);
    expect(isReceipt({ code: 12 })).toBe(false);
    expect(isReceipt("BX-7KX2M9")).toBe(false);
    expect(isReceipt(undefined)).toBe(false);
  });

  it("builds the email fallback with the request name and the account email", () => {
    expect(fallbackMailto("CANCELLATION", " ana@negocio.com ")).toBe(
      "mailto:support@boxlead.app?subject=Bot%C3%B3n%20de%20baja%20de%20servicio&body=Email%20de%20mi%20cuenta%20ana%40negocio.com",
    );
    expect(fallbackMailto("WITHDRAWAL", "")).toBe("mailto:support@boxlead.app?subject=Bot%C3%B3n%20de%20arrepentimiento");
  });

  it("tells a rate limit apart from an API that does not answer", () => {
    expect(isRateLimited(new ApiError("slow down", 429))).toBe(true);
    expect(isRateLimited(new ApiError("not found", 404))).toBe(false);
    expect(isRateLimited(new TypeError("Failed to fetch"))).toBe(false);
  });
});
