import { describe, expect, it } from "vitest";
import {
  COMMISSION_STATUS,
  DEMO_STATUS,
  INVITATION_STATUS,
  INVOICE_STATUS,
  labelsOf,
  optionsOf,
  PAYMENT_STATUS,
  PAYOUT_STATUS,
  planLabel,
  REFUND_STATUS,
  RESELLER_STATUS,
  SUBSCRIPTION_STATUS,
  tonesOf,
} from "./status";

const TABLES = {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
  INVOICE_STATUS,
  INVITATION_STATUS,
  DEMO_STATUS,
  RESELLER_STATUS,
  COMMISSION_STATUS,
  PAYOUT_STATUS,
};

describe("status table", () => {
  it("gives every status one label with a tone", () => {
    for (const [name, table] of Object.entries(TABLES)) {
      for (const [key, value] of Object.entries(table)) {
        expect(value.label, `${name}.${key}`).toMatch(/^[A-ZÁÉÍÓÚ]/);
        expect(["neutral", "accent", "success", "warning", "danger"], `${name}.${key}`).toContain(value.tone);
      }
    }
  });

  it("names a past due subscription the same everywhere", () => {
    expect(SUBSCRIPTION_STATUS.PAST_DUE.label).toBe("Cuota impaga");
    expect(labelsOf(SUBSCRIPTION_STATUS).PAST_DUE).toBe("Cuota impaga");
    expect(tonesOf(SUBSCRIPTION_STATUS).SUSPENDED).toBe("danger");
  });

  it("keeps closed states neutral and paid states green", () => {
    expect(SUBSCRIPTION_STATUS.CANCELED.tone).toBe("neutral");
    expect(INVOICE_STATUS.VOIDED.tone).toBe("neutral");
    expect(INVITATION_STATUS.REVOKED.tone).toBe("neutral");
    expect(COMMISSION_STATUS.PAID.tone).toBe("success");
    expect(PAYOUT_STATUS.PAID.tone).toBe("success");
  });

  it("builds filter options and plan names", () => {
    expect(optionsOf(INVOICE_STATUS)).toEqual([
      { value: "PENDING", label: "Para emitir" },
      { value: "ISSUED", label: "Emitida" },
      { value: "VOIDED", label: "Anulada" },
    ]);
    expect(planLabel("STARTER")).toBe("Starter");
    expect(planLabel(null)).toBe("Sin plan");
    expect(planLabel("OTRO")).toBe("OTRO");
  });
});
