import { describe, expect, it } from "vitest";
import type { MetricsReport, MetricsSegment, PlatformType } from "../../api/types";
import {
  categoryBreakdown,
  channelBreakdown,
  dailySeries,
  estimateMedianSeconds,
  funnelSteps,
  heatLevels,
  peakWindow,
  periodRange,
  rates,
  selectSegments,
  speedBands,
  sumSegments,
  UNCATEGORIZED,
  weeklySeries,
} from "./metricsModel";

function segment(platform: PlatformType, categoryId: string | null, leads: number, overrides: Partial<MetricsSegment> = {}): MetricsSegment {
  return {
    platform,
    categoryId,
    days: [
      { date: "2026-10-06", leads, conversations: leads, inboundMessages: leads * 3, agentReplies: leads * 2, humanReplies: 1, qualified: Math.floor(leads / 2), closed: Math.floor(leads / 4) },
    ],
    leadStatuses: { NEW: 1, CONTACTED: leads - 1 - 3, QUALIFIED: 2, LOST: 0, CLOSED: 1 },
    firstResponse: { agent: [leads - 2, 1, 0, 0, 0, 0, 0], human: [0, 0, 0, 0, 1, 0, 0], converted: [3, 0, 0, 0, 0, 0, 0], unanswered: 0 },
    inboundByHour: Array.from({ length: 168 }, (_, index) => (index === 19 ? leads : 0)),
    outsideHours: { conversations: 2, answeredUnder5m: 2 },
    agent: { resolved: leads - 2, handoffs: { ASKED_FOR_HUMAN: 1, AGENT_UNSURE: 0, TAKEN_OVER: 0 } },
    ...overrides,
  };
}

const report: MetricsReport = {
  from: "2026-10-01",
  to: "2026-10-07",
  timezone: "UTC",
  generatedAt: "",
  segments: [segment("WHATSAPP", "a", 10), segment("INSTAGRAM", "a", 20), segment("INSTAGRAM", null, 8)],
};

describe("metrics model", () => {
  it("filters segments by channel and category", () => {
    expect(selectSegments(report, { platform: "INSTAGRAM", category: null })).toHaveLength(2);
    expect(selectSegments(report, { platform: "ALL", category: UNCATEGORIZED })).toHaveLength(1);
    expect(selectSegments(report, { platform: "WHATSAPP", category: "a" })).toHaveLength(1);
    expect(selectSegments(undefined, { platform: "ALL", category: null })).toEqual([]);
  });

  it("adds segments and derives rates from period events", () => {
    const totals = sumSegments(report.segments);
    expect(totals.leads).toBe(38);
    expect(totals.qualified).toBe(5 + 10 + 4);
    expect(totals.closed).toBe(2 + 5 + 2);
    expect(totals.agent?.handoffs.ASKED_FOR_HUMAN).toBe(3);
    const result = rates(totals);
    expect(result.qualification).toBeCloseTo(19 / 38);
    expect(result.fastShare).toBeCloseTo(35 / 38);
    expect(result.answered).toBe(38);
  });

  it("estimates the median inside the right bucket", () => {
    expect(estimateMedianSeconds([10, 0, 0, 0, 0, 0, 0])).toBeCloseTo(30);
    expect(estimateMedianSeconds([0, 0, 0, 4, 0, 0, 0])).toBeCloseTo(900 + 2700 / 2);
    expect(estimateMedianSeconds([0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it("builds the funnel from the current status of the period leads", () => {
    const steps = funnelSteps(sumSegments([segment("META", null, 10)]));
    expect(steps.map((step) => step.value)).toEqual([10, 9, 3, 1]);
    expect(steps[2].fromPrevious).toBeCloseTo(3 / 9);
  });

  it("breaks down by channel and by category with the previous period", () => {
    const channels = channelBreakdown(report.segments, [segment("INSTAGRAM", "a", 14)]);
    expect(channels.map((row) => [row.id, row.totals.leads, row.previousLeads])).toEqual([
      ["INSTAGRAM", 28, 14],
      ["WHATSAPP", 10, 0],
    ]);
    const categories = categoryBreakdown(report.segments, [], [
      { id: "a", name: "A", description: null, color: "BLUE", position: 0, leadCount: 0, createdAt: "", updatedAt: "" },
    ]);
    expect(categories.map((row) => row.id)).toEqual(["a", UNCATEGORIZED]);
  });

  it("fills every day of the range and groups weeks ending on the last day", () => {
    const daily = dailySeries(report.segments, "2026-09-28", "2026-10-07");
    expect(daily).toHaveLength(10);
    expect(daily.find((point) => point.date === "2026-10-06")?.byPlatform.INSTAGRAM).toBe(28);
    const weeks = weeklySeries(daily);
    expect(weeks.map((week) => week.date)).toEqual(["2026-09-28", "2026-10-01"]);
    expect(weeks.reduce((sum, week) => sum + week.total, 0)).toBe(38);
  });

  it("finds the busiest window and scales the heatmap", () => {
    const hourly = Array.from({ length: 168 }, () => 0);
    hourly[24 + 19] = 10;
    hourly[24 + 20] = 6;
    hourly[3] = 1;
    expect(peakWindow(hourly)).toMatchObject({ weekday: 1, from: 18, to: 21 });
    expect(heatLevels(hourly).slice(43, 45)).toEqual([6, 4]);
    expect(peakWindow(Array.from({ length: 168 }, () => 0))).toBeNull();
  });

  it("groups speed into three bands", () => {
    const bands = speedBands({ agent: [8, 2, 0, 0, 0, 0, 0], human: [0, 0, 3, 1, 2, 1, 0], converted: [4, 1, 1, 0, 0, 0, 0], unanswered: 0 });
    expect(bands.map((band) => [band.answered, band.converted])).toEqual([
      [10, 5],
      [4, 1],
      [3, 0],
    ]);
  });

  it("compares with the period right before", () => {
    expect(periodRange(30, "2026-10-07")).toEqual({
      from: "2026-09-08",
      to: "2026-10-07",
      previousFrom: "2026-08-09",
      previousTo: "2026-09-07",
    });
  });
});
