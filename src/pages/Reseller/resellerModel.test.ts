import { describe, expect, it } from "vitest";
import type { SubscriptionStatus } from "../../api/types";
import { SUBSCRIPTION_LABELS, cycleLabel, cycleProgress, subscriptionLabel } from "./resellerModel";

describe("labels", () => {
  it("names every subscription status", () => {
    const statuses: SubscriptionStatus[] = ["INCOMPLETE", "ACTIVE", "PAST_DUE", "SUSPENDED", "PAUSED", "CANCELED"];
    expect(statuses.map((status) => SUBSCRIPTION_LABELS[status].label)).toEqual([
      "Sin pago",
      "Activo",
      "Pago atrasado",
      "Suspendido",
      "Pausado",
      "Dado de baja",
    ]);
  });

  it("shows an unknown status as it comes instead of breaking the page", () => {
    expect(subscriptionLabel("TRIAL" as SubscriptionStatus)).toEqual({ label: "TRIAL", tone: "neutral" });
  });
});

describe("cycles", () => {
  it("tells which charge a customer is on", () => {
    expect(cycleLabel(3, 6)).toBe("Cobro 3 de 6");
    expect(cycleLabel(0, 6)).toBe("Sin cobros todavía");
  });

  it("fills one step per charge", () => {
    expect(cycleProgress(3, 6)).toEqual([true, true, true, false, false, false]);
    expect(cycleProgress(9, 6)).toEqual([true, true, true, true, true, true]);
    expect(cycleProgress(1, -1)).toEqual([]);
  });
});
