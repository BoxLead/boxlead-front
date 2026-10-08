import { describe, expect, it } from "vitest";
import { UNCATEGORIZED } from "../../util/categories";
import { emptyStatuses } from "../../util/metrics";
import { categoryBreakdown, channelBreakdown, funnelSteps } from "./breakdown";
import { emptyTotals } from "./metricsModel";
import { testDay, testSegment } from "./testSegments";

const current = [
  testSegment("WHATSAPP", "a", [testDay("2026-10-06", 10, { qualified: 5 })]),
  testSegment("INSTAGRAM", "a", [testDay("2026-10-06", 20)]),
  testSegment("INSTAGRAM", "gone", [testDay("2026-10-06", 8)]),
];

describe("breakdown", () => {
  it("groups by channel with the previous period", () => {
    const rows = channelBreakdown(current, [testSegment("INSTAGRAM", "a", [testDay("2026-09-06", 14)])]);
    expect(rows.map((row) => [row.id, row.totals.leads, row.previousLeads])).toEqual([
      ["INSTAGRAM", 28, 14],
      ["WHATSAPP", 10, 0],
    ]);
    expect(rows[1].qualification).toBeCloseTo(0.5);
  });

  it("sends unknown categories to the uncategorized row", () => {
    const rows = categoryBreakdown(current, [], [
      { id: "a", name: "A", description: null, color: "BLUE", position: 0, leadCount: 0, createdAt: "", updatedAt: "" },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a", UNCATEGORIZED]);
  });

  it("builds the funnel from the current status of the period leads", () => {
    const totals = { ...emptyTotals(), leads: 10, statuses: { ...emptyStatuses(), NEW: 1, QUALIFIED: 2, CLOSED: 1 } };
    const previous = { ...emptyTotals(), leads: 8, statuses: { ...emptyStatuses(), NEW: 2, QUALIFIED: 2 } };
    const steps = funnelSteps(totals, previous);
    expect(steps.map((step) => [step.value, step.previous])).toEqual([
      [10, 8],
      [9, 6],
      [3, 2],
    ]);
    expect(steps[2].fromPrevious).toBeCloseTo(3 / 9);
    expect(steps[2].fromStart).toBeCloseTo(0.3);
  });
});
