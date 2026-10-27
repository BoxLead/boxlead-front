import { describe, expect, it } from "vitest";
import { actionsFor, nextStep } from "./subscriptionSteps";
import type { SubscriptionRow } from "./types";

const base: SubscriptionRow = {
  id: "s1",
  userId: "u1",
  email: "ana@example.com",
  planCode: "STARTER",
  status: "ACTIVE",
  price: { amountMinor: 6000, currency: "USD" },
  charge: { amountMinor: 8700000, currency: "ARS" },
  currentPeriodEnd: "2026-11-20T15:00:00Z",
  paidThrough: "2026-11-20T15:00:00Z",
  graceUntil: null,
  suspendedUntil: null,
  cancelAtPeriodEnd: false,
  disputed: false,
  canceledAt: null,
  cancelReason: null,
  createdAt: "2026-09-20T15:00:00Z",
};

describe("subscription steps", () => {
  it("says what comes next for each status", () => {
    expect(nextStep(base)).toBe("Renueva el 20 nov 2026");
    expect(nextStep({ ...base, cancelAtPeriodEnd: true })).toBe("Termina el 20 nov 2026");
    expect(nextStep({ ...base, status: "PAST_DUE", graceUntil: "2026-10-29T15:00:00Z" })).toBe("En gracia hasta el 29 oct 2026");
    expect(nextStep({ ...base, status: "SUSPENDED", disputed: true })).toBe("En disputa en Mercado Pago");
    expect(nextStep({ ...base, status: "CANCELED", canceledAt: "2026-10-21T15:00:00Z", cancelReason: "ADMIN_CANCELED" })).toBe(
      "Cancelada el 21 oct 2026, la canceló el equipo",
    );
  });

  it("offers only the actions core accepts for the status", () => {
    expect(actionsFor(base)).toEqual(["pause", "cancel"]);
    expect(actionsFor({ ...base, status: "SUSPENDED" })).toEqual(["pause", "cancel"]);
    expect(actionsFor({ ...base, status: "PAUSED" })).toEqual(["resume", "cancel"]);
    expect(actionsFor({ ...base, status: "INCOMPLETE" })).toEqual(["cancel"]);
    expect(actionsFor({ ...base, status: "CANCELED" })).toEqual([]);
  });
});
