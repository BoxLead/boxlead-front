import { describe, expect, it } from "vitest";
import { UNCATEGORIZED } from "../../util/categories";
import { emptyStatuses } from "../../util/metrics";
import { categoryBreakdown, channelBreakdown } from "./breakdown";
import { funnelSteps } from "./funnel";
import { emptyTotals, selectSegments, sumSegments } from "./metricsModel";
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

  it("sends deleted categories to the uncategorized row and the filter agrees", () => {
    const known = new Set(["a"]);
    const rows = categoryBreakdown(current, [], known);
    expect(rows.map((row) => [row.id, row.totals.leads])).toEqual([
      ["a", 30],
      [UNCATEGORIZED, 8],
    ]);
    const report = { from: "", to: "", timezone: "UTC", segments: current };
    const filtered = selectSegments(report, { platform: "ALL", category: UNCATEGORIZED }, known);
    expect(sumSegments(filtered).leads).toBe(8);
  });

  it("knows each row median first response", () => {
    const answered = testSegment("META", null, [testDay("2026-10-06", 4)], {
      firstResponse: { agent: [4, 0, 0, 0, 0, 0, 0], human: [0, 0, 0, 0, 0, 0, 0], converted: [0, 0, 0, 0, 0, 0, 0], unanswered: 0 },
    });
    expect(channelBreakdown([answered], [])[0].medianResponse).toBeCloseTo(30);
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
