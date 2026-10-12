import { describe, expect, it } from "vitest";
import { dayTotals, formatMetric, metricChange, metricDefinition, metricSeries, metricTotal } from "./series";
import { testDay, testSegment } from "./testSegments";

describe("metric series", () => {
  const days = dayTotals(
    [
      testSegment("WHATSAPP", null, [
        testDay("2026-10-01", 10, { qualified: 4, responseBuckets: [6, 2, 0, 2, 0, 0, 0] }),
        testDay("2026-10-03", 6, { unanswered: 2, responseBuckets: [4, 0, 0, 0, 0, 0, 0] }),
      ]),
      testSegment("INSTAGRAM", null, [testDay("2026-10-01", 2, { qualified: 2 })]),
    ],
    "2026-10-01",
    "2026-10-03",
  );

  it("adds every segment day by day and fills the gaps", () => {
    expect(days.map((day) => [day.date, day.leads, day.unanswered])).toEqual([
      ["2026-10-01", 12, 0],
      ["2026-10-02", 0, 0],
      ["2026-10-03", 6, 2],
    ]);
  });

  it("totals leads, response speed and qualification", () => {
    expect(metricTotal("leads", days)).toBe(18);
    expect(metricTotal("qualification", days)).toBeCloseTo(6 / 18);
    expect(metricTotal("fast", days)).toBeCloseTo(14 / 18);
    expect(metricTotal("response", days)).toBeCloseTo(8 / 12 * 60);
  });

  it("smooths rates and durations over seven days and keeps leads per day", () => {
    expect(metricSeries("leads", days, "2026-10-01", "2026-10-03", false).map((point) => point.value)).toEqual([12, 0, 6]);
    const rate = metricSeries("qualification", days, "2026-10-01", "2026-10-03", false);
    expect(rate[1].value).toBeCloseTo(6 / 12);
    expect(rate[2].value).toBeCloseTo(6 / 18);
  });

  it("groups full weeks that end on the last day", () => {
    const long = dayTotals([testSegment("META", null, [testDay("2026-09-01", 1), testDay("2026-10-07", 5)])], "2026-09-01", "2026-10-07");
    const weeks = metricSeries("leads", long, "2026-09-01", "2026-10-07", true);
    expect(weeks[weeks.length - 1]).toEqual({ date: "2026-10-01", end: "2026-10-07", value: 5 });
    expect(weeks[0]).toMatchObject({ date: "2026-09-03", end: "2026-09-09" });
    const ninety = metricSeries("leads", long, "2026-07-10", "2026-10-07", true);
    expect(ninety).toHaveLength(12);
    expect(ninety[0]).toMatchObject({ date: "2026-07-16", end: "2026-07-22" });
  });

  it("compares rates in points, the rest in percent, and formats each kind", () => {
    expect(metricChange(metricDefinition("qualification"), 0.4, 0.35)).toBeCloseTo(0.05);
    expect(metricChange(metricDefinition("response"), 30, 60)).toBeCloseTo(-0.5);
    expect(metricChange(metricDefinition("leads"), 5, 0)).toBeNull();
    expect(formatMetric(metricDefinition("fast"), 0.873)).toBe("87%");
    expect(formatMetric(metricDefinition("response"), 95)).toBe("2 min");
    expect(formatMetric(metricDefinition("leads"), null)).toBe("—");
  });
});
