import { describe, expect, it } from "vitest";
import { emptyWeek } from "../../util/metrics";
import { heatLevels, peakWindow } from "./hours";

describe("hours", () => {
  it("finds the busiest three hour window and scales the heatmap", () => {
    const hourly = emptyWeek();
    hourly[24 + 19] = 10;
    hourly[24 + 20] = 6;
    hourly[3] = 1;
    expect(peakWindow(hourly)).toMatchObject({ weekday: 1, from: 18, to: 21 });
    expect(heatLevels(hourly, 6).slice(43, 45)).toEqual([6, 4]);
    expect(peakWindow(emptyWeek())).toBeNull();
  });
});
