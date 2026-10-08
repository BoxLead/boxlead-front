import { describe, expect, it } from "vitest";
import { addDays, weekdayIndex } from "../../util/dates";
import { forecastDaily } from "./forecast";

function history(days: number, value: (index: number, date: string) => number) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays("2026-07-01", index);
    return { date, value: value(index, date) };
  });
}

describe("forecast", () => {
  it("needs four weeks of history", () => {
    expect(forecastDaily(history(20, () => 10), 7)).toBeNull();
    expect(forecastDaily(history(40, () => 0), 7)).toBeNull();
  });

  it("follows the trend and the weekly pattern", () => {
    const series = history(84, (index, date) => 10 + index * 0.1 + (weekdayIndex(date) >= 5 ? 6 : 0));
    const forecast = forecastDaily(series, 7, 1);
    expect(forecast).not.toBeNull();
    const points = forecast?.points ?? [];
    expect(points[0].date).toBe(addDays(series[series.length - 1].date, 2));
    const weekend = points.filter((point) => weekdayIndex(point.date) >= 5);
    const weekday = points.filter((point) => weekdayIndex(point.date) < 5);
    expect(Math.min(...weekend.map((p) => p.value))).toBeGreaterThan(Math.max(...weekday.map((p) => p.value)));
    expect(forecast?.total).toBeGreaterThan(7 * 18);
    expect(forecast?.low).toBeLessThanOrEqual(forecast?.total ?? 0);
    expect(forecast?.high).toBeGreaterThanOrEqual(forecast?.total ?? 0);
  });

  it("ignores the days before the account had any activity", () => {
    const young = history(84, (index) => (index < 70 ? 0 : 10));
    expect(forecastDaily(young, 14)).toBeNull();
    const month = history(84, (index) => (index < 44 ? 0 : 10));
    const forecast = forecastDaily(month, 14);
    expect(forecast?.total).toBeCloseTo(140, 0);
  });
});
