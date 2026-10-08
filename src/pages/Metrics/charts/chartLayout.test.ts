import { describe, expect, it } from "vitest";
import { layoutChart, MARGIN, type ChartPoint } from "./chartLayout";

const point = (index: number, value: number | null, previous: number | null = null): ChartPoint => ({
  key: String(index),
  axisLabel: String(index),
  title: String(index),
  value,
  previous,
});

describe("chart layout", () => {
  const layout = layoutChart({
    points: [point(0, 10, 5), point(1, 30, 15), point(2, 4)],
    estimates: [
      { key: "e0", axisLabel: "", title: "", value: 20, low: 10, high: 38 },
      { key: "e1", axisLabel: "", title: "", value: 22, low: 12, high: 30 },
    ],
    width: 460,
    height: 300,
    partialLast: true,
  });

  it("fits every value, the previous period and the estimate range", () => {
    expect(layout.ticks).toEqual([0, 10, 20, 30, 40]);
    expect(layout.y(40)).toBe(MARGIN.top);
    expect(layout.y(0)).toBe(layout.baseline);
  });

  it("keeps the unfinished last point apart from the line", () => {
    expect(layout.partial).toEqual({ x: layout.x(2), y: layout.y(4) });
    expect(layout.line.endsWith(`${layout.x(1).toFixed(1)},${layout.y(30).toFixed(1)}`)).toBe(true);
    expect(layout.defaultIndex).toBe(1);
  });

  it("maps a pointer offset to the closest point", () => {
    expect(layout.indexAt(0)).toBe(0);
    expect(layout.indexAt(layout.x(3) + layout.step * 0.4)).toBe(3);
    expect(layout.indexAt(10_000)).toBe(4);
  });
});
