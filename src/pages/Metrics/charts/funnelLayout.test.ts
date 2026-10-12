import { describe, expect, it } from "vitest";
import { layoutFunnel } from "./funnelLayout";

describe("funnel layout", () => {
  const layout = layoutFunnel([100, 80, 30], [90, 70, 40], 600, 220);

  it("centers each stage in its column and scales it to the largest value", () => {
    expect(layout.columnWidth).toBe(200);
    expect(layout.bars[0]).toEqual({ x: 80, y: 10, width: 40, height: 200 });
    expect(layout.bars[2].height).toBeCloseTo(60);
    expect(layout.bars[2].y + layout.bars[2].height / 2).toBeCloseTo(110);
  });

  it("connects consecutive stages and draws the previous period", () => {
    expect(layout.bands).toHaveLength(2);
    expect(layout.bands[0].startsWith("M120,10")).toBe(true);
    expect(layout.ghosts[2].height).toBeCloseTo(80);
  });

  it("keeps empty stages visible", () => {
    expect(layoutFunnel([0, 0, 0], [0, 0, 0], 300, 200).bars[0].height).toBe(3);
  });
});
