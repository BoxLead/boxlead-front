import { describe, expect, it } from "vitest";
import type { MetricsDay, MetricsSegment } from "../../api/types";
import { emptyTotals } from "./metricsModel";
import { dayTotals, formatMetric, metricChange, metricSeries, METRICS, metricTotal } from "./series";

function day(date: string, leads: number, extra: Partial<MetricsDay> = {}): MetricsDay {
  return {
    date,
    leads,
    conversations: leads,
    inboundMessages: leads,
    agentReplies: 0,
    humanReplies: 0,
    qualified: 0,
    closed: 0,
    firstResponses: leads,
    fastResponses: leads,
    ...extra,
  };
}

function segment(days: MetricsDay[]): MetricsSegment {
  const totals = emptyTotals();
  return {
    platform: "WHATSAPP",
    categoryId: null,
    days,
    leadStatuses: totals.statuses,
    firstResponse: totals.firstResponse,
    inboundByHour: totals.inboundByHour,
    outsideHours: null,
    agent: null,
  };
}

const definition = (key: string) => METRICS.find((metric) => metric.key === key) ?? METRICS[0];

describe("metric series", () => {
  const days = dayTotals(
    [
      segment([day("2026-10-01", 10, { qualified: 4, closed: 1, fastResponses: 8 }), day("2026-10-03", 6, { closed: 2 })]),
      segment([day("2026-10-01", 2, { qualified: 2 })]),
    ],
    "2026-10-01",
    "2026-10-03",
  );

  it("adds every segment day by day and fills the gaps", () => {
    expect(days.map((d) => [d.date, d.leads, d.closed])).toEqual([
      ["2026-10-01", 12, 1],
      ["2026-10-02", 0, 0],
      ["2026-10-03", 6, 2],
    ]);
  });

  it("totals counts, rates and money", () => {
    expect(metricTotal("leads", days, null)).toBe(18);
    expect(metricTotal("qualification", days, null)).toBeCloseTo(6 / 18);
    expect(metricTotal("fast", days, null)).toBeCloseTo(16 / 18);
    expect(metricTotal("revenue", days, 1000)).toBe(3000);
    expect(metricTotal("revenue", days, null)).toBeNull();
  });

  it("smooths rates over the last seven days and keeps counts per day", () => {
    const counts = metricSeries("leads", days, "2026-10-01", "2026-10-03", false, null);
    expect(counts.map((point) => point.value)).toEqual([12, 0, 6]);
    const rate = metricSeries("qualification", days, "2026-10-01", "2026-10-03", false, null);
    expect(rate[1].value).toBeCloseTo(6 / 12);
    expect(rate[2].value).toBeCloseTo(6 / 18);
  });

  it("groups weeks so the last one ends on the last day", () => {
    const long = dayTotals([segment([day("2026-09-01", 1), day("2026-10-07", 5)])], "2026-09-01", "2026-10-07");
    const weeks = metricSeries("leads", long, "2026-09-01", "2026-10-07", true, null);
    expect(weeks[weeks.length - 1]).toEqual({ date: "2026-10-01", end: "2026-10-07", value: 5 });
    expect(weeks[0]).toMatchObject({ date: "2026-09-03", end: "2026-09-09", value: 0 });
    const ninety = metricSeries("leads", long, "2026-07-10", "2026-10-07", true, null);
    expect(ninety[0]).toMatchObject({ date: "2026-07-10", end: "2026-07-15" });
  });

  it("compares rates in points and the rest in percent", () => {
    expect(metricChange(definition("qualification"), 0.4, 0.35)).toBeCloseTo(0.05);
    expect(metricChange(definition("leads"), 120, 100)).toBeCloseTo(0.2);
    expect(metricChange(definition("leads"), 5, 0)).toBeNull();
    expect(formatMetric(definition("fast"), 0.873, "ARS")).toBe("87%");
    expect(formatMetric(definition("revenue"), null, "ARS")).toBe("—");
  });
});
