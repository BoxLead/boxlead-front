import { describe, expect, it } from "vitest";
import type { MetricsReport } from "../../api/types";
import { UNCATEGORIZED } from "../../util/categories";
import {
  conversionBySpeed,
  estimateMedianSeconds,
  handoffTotal,
  percentChange,
  periodRange,
  qualificationRate,
  selectSegments,
  sumSegments,
} from "./metricsModel";
import { testDay, testSegment } from "./testSegments";

const report: MetricsReport = {
  from: "2026-10-01",
  to: "2026-10-07",
  timezone: "UTC",
  generatedAt: "",
  segments: [
    testSegment("WHATSAPP", "a", [testDay("2026-10-06", 10, { qualified: 5 })]),
    testSegment("INSTAGRAM", "a", [testDay("2026-10-06", 20, { qualified: 4 })]),
    testSegment("INSTAGRAM", null, [testDay("2026-10-06", 8)], {
      outsideHours: { conversations: 3, answeredUnder5m: 2 },
      agent: { resolved: 6, handoffs: { ASKED_FOR_HUMAN: 1, AGENT_UNSURE: 1, TAKEN_OVER: 0 } },
    }),
  ],
};

describe("metrics model", () => {
  it("filters segments by channel and category", () => {
    expect(selectSegments(report, { platform: "INSTAGRAM", category: null })).toHaveLength(2);
    expect(selectSegments(report, { platform: "ALL", category: UNCATEGORIZED })).toHaveLength(1);
    expect(selectSegments(report, { platform: "WHATSAPP", category: "a" })).toHaveLength(1);
    expect(selectSegments(undefined, { platform: "ALL", category: null })).toEqual([]);
  });

  it("adds every segment", () => {
    const totals = sumSegments(report.segments);
    expect(totals.leads).toBe(38);
    expect(totals.qualified).toBe(9);
    expect(qualificationRate(totals)).toBeCloseTo(9 / 38);
    expect(totals.outsideHours).toEqual({ conversations: 3, answeredUnder5m: 2 });
    expect(handoffTotal(totals.agent)).toBe(2);
    expect(handoffTotal(null)).toBe(0);
  });

  it("estimates the median inside the right bucket", () => {
    expect(estimateMedianSeconds([10, 0, 0, 0, 0, 0, 0])).toBeCloseTo(30);
    expect(estimateMedianSeconds([0, 0, 0, 4, 0, 0, 0])).toBeCloseTo(900 + 2700 / 2);
    expect(estimateMedianSeconds([0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it("compares conversion of fast and slow first answers", () => {
    const result = conversionBySpeed(
      { agent: [8, 2, 0, 0, 0, 0, 0], human: [0, 0, 3, 1, 2, 1, 0], converted: [4, 1, 1, 0, 1, 0, 0], unanswered: 0 },
      4,
    );
    expect(result).toEqual({ fast: 0.5, slow: 1 / 3, fastCount: 10, slowCount: 3 });
  });

  it("compares with the period right before", () => {
    expect(percentChange(120, 100)).toBeCloseTo(0.2);
    expect(percentChange(5, 0)).toBeNull();
    expect(periodRange(30, "2026-10-07")).toEqual({
      from: "2026-09-08",
      to: "2026-10-07",
      previousFrom: "2026-08-09",
      previousTo: "2026-09-07",
    });
  });
});
