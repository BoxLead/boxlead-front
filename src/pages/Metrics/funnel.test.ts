import { describe, expect, it } from "vitest";
import { funnelSteps } from "./funnel";
import { emptyStatuses } from "../../util/metrics";
import { emptyTotals, type Totals } from "./metricsModel";

type TotalsPatch = Partial<Omit<Totals, "statuses">> & { statuses?: Partial<Totals["statuses"]> };

function totals(patch: TotalsPatch): Totals {
  return { ...emptyTotals(), ...patch, statuses: { ...emptyStatuses(), ...patch.statuses } };
}

describe("funnelSteps", () => {
  it("counts qualified leads from the qualified total, not from the status", () => {
    const steps = funnelSteps(totals({ leads: 10, qualified: 4, statuses: { NEW: 2, CONTACTED: 6, QUALIFIED: 1, CLOSED: 1 } }), emptyTotals());
    expect(steps.map((step) => step.value)).toEqual([10, 8, 4]);
  });

  it("never lets qualified exceed contacted", () => {
    const steps = funnelSteps(totals({ leads: 10, qualified: 5, statuses: { NEW: 8, CONTACTED: 2 } }), emptyTotals());
    expect(steps.map((step) => step.value)).toEqual([10, 5, 5]);
    expect(steps[2].fromPrevious).toBe(1);
  });

  it("explains what qualified means", () => {
    const steps = funnelSteps(totals({ leads: 1 }), emptyTotals());
    expect(steps[2].explanation).toBe("Tibio o Caliente, o marcados como calificados");
    expect(steps[0].explanation).toBeNull();
  });

  it("compares with the previous period", () => {
    const steps = funnelSteps(totals({ leads: 10, qualified: 4 }), totals({ leads: 8, qualified: 2 }));
    expect(steps[2].previous).toBe(2);
  });
});
