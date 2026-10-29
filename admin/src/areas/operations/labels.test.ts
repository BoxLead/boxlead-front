import { describe, expect, it } from "vitest";
import { ACTION_LABELS, labelOf } from "./labels";

describe("audit labels", () => {
  it("names the payment to give back and the failed cancellation", () => {
    expect(labelOf(ACTION_LABELS, "PAYMENT_REFUND_NEEDED")).toBe("Pago para devolver");
    expect(labelOf(ACTION_LABELS, "SUBSCRIPTION_CANCEL_FAILED")).toBe("Cancelación de suscripción fallida");
    expect(labelOf(ACTION_LABELS, "SUBSCRIPTION_CANCEL_REQUESTED")).toBe("Baja pedida");
  });
});
