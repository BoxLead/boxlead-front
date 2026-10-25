import { describe, expect, it } from "vitest";
import { allowedPeriods, fitPeriod, forecastAllowed, historyNote } from "./planPeriods";

describe("periods allowed by the plan", () => {
  it("offers every period when the plan sets no history limit", () => {
    expect(allowedPeriods({})).toEqual([7, 30, 90]);
    expect(allowedPeriods({ METRICS_HISTORY_DAYS: null })).toEqual([7, 30, 90]);
    expect(forecastAllowed({})).toBe(true);
    expect(historyNote({})).toBeNull();
  });

  it("only offers a period when it fits twice, to compare with the previous one", () => {
    expect(allowedPeriods({ METRICS_HISTORY_DAYS: 180 })).toEqual([7, 30, 90]);
    expect(allowedPeriods({ METRICS_HISTORY_DAYS: 179 })).toEqual([7, 30]);
    expect(allowedPeriods({ METRICS_HISTORY_DAYS: 60 })).toEqual([7, 30]);
    expect(allowedPeriods({ METRICS_HISTORY_DAYS: 59 })).toEqual([7]);
    expect(allowedPeriods({ METRICS_HISTORY_DAYS: 14 })).toEqual([7]);
  });

  it("keeps the shortest period when not even that one fits", () => {
    expect(allowedPeriods({ METRICS_HISTORY_DAYS: 10 })).toEqual([7]);
  });

  it("hides the forecast without 84 days of history", () => {
    expect(forecastAllowed({ METRICS_HISTORY_DAYS: 84 })).toBe(true);
    expect(forecastAllowed({ METRICS_HISTORY_DAYS: 83 })).toBe(false);
    expect(forecastAllowed({ METRICS_HISTORY_DAYS: 30 })).toBe(false);
  });

  it("moves a period that is not allowed to the longest one that is", () => {
    expect(fitPeriod(90, [7, 30])).toBe(30);
    expect(fitPeriod(30, [7])).toBe(7);
    expect(fitPeriod(7, [7, 30])).toBe(7);
  });

  it("explains the history limit only when it hides a period", () => {
    expect(historyNote({ METRICS_HISTORY_DAYS: 30 })).toBe("Tu plan incluye 30 días de historial.");
    expect(historyNote({ METRICS_HISTORY_DAYS: 180 })).toBeNull();
  });
});
