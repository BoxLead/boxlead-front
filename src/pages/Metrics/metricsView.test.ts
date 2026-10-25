import { describe, expect, it } from "vitest";
import type { CategoryResponse, MetricsReport, MetricsSettings } from "../../api/types";
import { dateRange } from "../../util/dates";
import { buildChartData } from "./chartData";
import { periodRange } from "./metricsModel";
import { buildMetricsView, type MetricsInput } from "./metricsView";
import { testDay, testSegment } from "./testSegments";

const TODAY = "2026-10-07";

const categories: CategoryResponse[] = ["Consulta", "Presupuesto"].map((name, position) => ({
  id: `c${position}`,
  name,
  description: null,
  color: "BLUE",
  position,
  leadCount: 0,
  createdAt: "",
  updatedAt: "",
}));

const settings: MetricsSettings = {
  manualReplyMinutes: 4,
  businessHours: { weekdays: [0, 1, 2, 3, 4, 5], from: 9, to: 19 },
};

const SEGMENTS = [
  { platform: "WHATSAPP", categoryId: "c0", leads: 4 },
  { platform: "WHATSAPP", categoryId: "c1", leads: 2 },
  { platform: "INSTAGRAM", categoryId: "c0", leads: 3 },
  { platform: "META", categoryId: null, leads: 1 },
] as const;

function report(from: string, to: string): MetricsReport {
  return {
    from,
    to,
    timezone: "UTC",
    segments: SEGMENTS.map(({ platform, categoryId, leads }) =>
      testSegment(
        platform,
        categoryId,
        dateRange(from, to).map((date, index) => testDay(date, leads + (index % 3), { qualified: 1 })),
      ),
    ),
  };
}

function input(period: 7 | 30 | 90, patch: Partial<MetricsInput> = {}): MetricsInput {
  const range = periodRange(period, TODAY);
  return {
    period,
    filters: { platform: "ALL", category: null },
    range,
    current: report(range.from, range.to),
    previous: report(range.previousFrom, range.previousTo),
    history: report("2026-07-15", "2026-10-06"),
    settings,
    categories,
    ...patch,
  };
}

describe("metrics view", () => {
  it("keeps every channel in the channel breakdown while one is selected", () => {
    const all = buildMetricsView(input(30));
    const filtered = buildMetricsView(input(30, { filters: { platform: "WHATSAPP", category: null } }));
    expect(filtered.channels.map((row) => row.id)).toEqual(all.channels.map((row) => row.id));
    expect(filtered.totals.leads).toBe(all.channels.find((row) => row.id === "WHATSAPP")?.totals.leads);
    expect(filtered.categoryRows.reduce((sum, row) => sum + row.totals.leads, 0)).toBe(filtered.totals.leads);
  });

  it("totals every indicator and forecasts leads only", () => {
    const view = buildMetricsView(input(30));
    expect(view.current.leads).toBe(view.totals.leads);
    expect(view.current.fast).toBe(1);
    expect(view.current.response).toBeGreaterThan(0);
    expect(Object.keys(view.forecasts)).toEqual(["leads"]);
    expect(view.categoryName("none")).toBe("Sin categoría");
    expect(view.categoryName("c1")).toBe("Presupuesto");
  });

  it("charts daily leads with an open last day and weekly views for 90 days", () => {
    const month = buildChartData(buildMetricsView(input(30)), "leads");
    expect(month).toMatchObject({ weekly: false, partialLast: true });
    expect(month.points).toHaveLength(30);
    expect(month.estimates).toHaveLength(14);

    const quarter = buildChartData(buildMetricsView(input(90)), "response");
    expect(quarter).toMatchObject({ weekly: true, partialLast: false, forecastTotal: null });
    expect(quarter.points[quarter.points.length - 1].title).toBe("1 oct al 7 oct, hasta ahora");
  });
});
