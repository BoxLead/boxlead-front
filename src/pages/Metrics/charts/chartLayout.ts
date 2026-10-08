import { labelIndexes, niceScale } from "./scale";
import { smoothPath, type Point } from "./path";

export type ChartPoint = {
  key: string;
  axisLabel: string;
  title: string;
  value: number | null;
  previous: number | null;
};

export type ChartEstimate = {
  key: string;
  axisLabel: string;
  title: string;
  value: number;
  low: number;
  high: number;
};

export const MARGIN = { top: 12, right: 12, bottom: 28, left: 48 };

type LayoutInput = {
  points: ChartPoint[];
  estimates: ChartEstimate[];
  width: number;
  height: number;
  partialLast: boolean;
};

export function layoutChart({ points, estimates, width, height, partialLast }: LayoutInput) {
  const total = points.length + estimates.length;
  const innerWidth = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const step = innerWidth / Math.max(1, total - 1);
  const scale = niceScale(
    Math.max(0, ...points.map((p) => Math.max(p.value ?? 0, p.previous ?? 0)), ...estimates.map((e) => e.high)),
    4,
  );
  const baseline = MARGIN.top + innerHeight;
  const x = (index: number) => MARGIN.left + step * index;
  const y = (value: number) => baseline - (value / scale.max) * innerHeight;

  const actual: Point[] = points.flatMap((p, i) => (p.value === null ? [] : [{ x: x(i), y: y(p.value) }]));
  const previous: Point[] = points.flatMap((p, i) => (p.previous === null ? [] : [{ x: x(i), y: y(p.previous) }]));
  const settled = partialLast && actual.length > 2 ? actual.slice(0, -1) : actual;
  const line = smoothPath(settled);
  const first = settled[0];
  const last = settled[settled.length - 1];
  const estimateX = (index: number) => x(points.length + index);

  return {
    total,
    step,
    baseline,
    x,
    y,
    ticks: scale.ticks,
    line,
    area: settled.length > 1 ? `${line} L${last.x.toFixed(1)},${baseline} L${first.x.toFixed(1)},${baseline} Z` : "",
    partial: settled.length < actual.length ? actual[actual.length - 1] : null,
    previous: previous.length > 1 ? smoothPath(previous) : "",
    estimate: estimates.length > 1 ? smoothPath(estimates.map((e, i) => ({ x: estimateX(i), y: y(e.value) }))) : "",
    band:
      estimates.length > 1
        ? [
            ...estimates.map((e, i) => `${estimateX(i)},${y(e.high)}`),
            ...estimates.map((e, i) => `${estimateX(i)},${y(e.low)}`).reverse(),
          ].join(" ")
        : "",
    labels: new Set(labelIndexes(total, width < 400 ? 3 : width < 640 ? 4 : 7)),
    defaultIndex: partialLast && points.length > 1 ? points.length - 2 : points.length - 1,
    indexAt: (offset: number) => Math.min(total - 1, Math.max(0, Math.round((offset - MARGIN.left) / step))),
  };
}
