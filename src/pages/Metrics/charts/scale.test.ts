import { describe, expect, it } from "vitest";
import { labelIndexes, niceMax, ticks } from "./scale";

describe("chart scale", () => {
  it("rounds the axis up to a readable number", () => {
    expect(niceMax(37)).toBe(40);
    expect(niceMax(112)).toBe(150);
    expect(niceMax(0)).toBe(4);
    expect(ticks(40)).toEqual([0, 10, 20, 30, 40]);
  });

  it("always labels the latest point", () => {
    expect(labelIndexes(30, 6)).toEqual([4, 9, 14, 19, 24, 29]);
    expect(labelIndexes(3, 6)).toEqual([0, 1, 2]);
  });
});
