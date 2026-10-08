import { describe, expect, it } from "vitest";
import { labelIndexes, niceScale } from "./scale";

describe("chart scale", () => {
  it("splits the axis into round steps", () => {
    expect(niceScale(37)).toEqual({ max: 40, ticks: [0, 10, 20, 30, 40] });
    expect(niceScale(0.43)).toEqual({ max: 0.6, ticks: [0, 0.15, 0.3, 0.45, 0.6] });
    expect(niceScale(6_200_000).max).toBe(8_000_000);
  });

  it("always labels the latest point", () => {
    expect(labelIndexes(30, 6)).toEqual([4, 9, 14, 19, 24, 29]);
    expect(labelIndexes(3, 6)).toEqual([0, 1, 2]);
  });
});
