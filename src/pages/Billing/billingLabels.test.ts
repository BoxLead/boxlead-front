import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import { billingErrorMessage } from "./billingLabels";

describe("billingErrorMessage", () => {
  it("asks to wait when the checkout has a payment in process", () => {
    const error = new ApiError("x", 409, { error: "Conflict", message: "The checkout has a payment in process", code: "CHECKOUT_PENDING" });
    expect(billingErrorMessage(error, "fallback")).toBe(
      "Tenés un pago en proceso en Mercado Pago. Esperá a que se confirme antes de pagar otro plan o con otro email.",
    );
  });

  it("keeps the fallback for an unknown code", () => {
    expect(billingErrorMessage(new ApiError("x", 409, { code: "SOMETHING" }), "fallback")).toBe("fallback");
  });
});
