import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { labelIndexes, niceScale } from "./scale";
import { smoothPath, type Point } from "./path";
import { useElementWidth } from "./useElementWidth";
import "./MetricChart.css";

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

type MetricChartProps = {
  metricKey: string;
  points: ChartPoint[];
  estimates: ChartEstimate[];
  format: (value: number) => string;
  formatAxis: (value: number) => string;
  summary: string;
  partialLast: boolean;
};

const MARGIN = { top: 12, right: 12, bottom: 28, left: 48 };

export function MetricChart({ metricKey, points, estimates, format, formatAxis, summary, partialLast }: MetricChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const gradientId = `metric-fill-${useId().replace(/:/g, "")}`;
  const readoutId = useId();
  const [active, setActive] = useState<number | null>(null);
  const total = points.length + estimates.length;
  const lastActual = partialLast && points.length > 1 ? points.length - 2 : points.length - 1;
  const current = active ?? lastActual;
  const height = width < 560 ? 220 : 300;
  const innerWidth = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const step = innerWidth / Math.max(1, total - 1);
  const scale = niceScale(
    Math.max(
      0,
      ...points.map((p) => Math.max(p.value ?? 0, p.previous ?? 0)),
      ...estimates.map((e) => e.high),
    ),
    4,
  );
  const max = scale.max;
  const x = (index: number) => MARGIN.left + step * index;
  const y = (value: number) => MARGIN.top + innerHeight - (value / max) * innerHeight;
  const baseline = MARGIN.top + innerHeight;

  const actual: Point[] = points.flatMap((p, i) => (p.value === null ? [] : [{ x: x(i), y: y(p.value) }]));
  const previous: Point[] = points.flatMap((p, i) => (p.previous === null ? [] : [{ x: x(i), y: y(p.previous) }]));
  const settled = partialLast && actual.length > 2 ? actual.slice(0, -1) : actual;
  const line = smoothPath(settled);
  const partial = settled.length < actual.length ? actual[actual.length - 1] : null;
  const area =
    settled.length > 1 ? `${line} L${settled[settled.length - 1].x},${baseline} L${settled[0].x},${baseline} Z` : "";
  const estimatePoints: Point[] = estimates.map((e, i) => ({ x: x(points.length + i), y: y(e.value) }));
  const estimateLine = estimatePoints.length > 1 ? smoothPath(estimatePoints) : "";
  const band =
    estimates.length > 1
      ? [
          ...estimates.map((e, i) => `${x(points.length + i)},${y(e.high)}`),
          ...[...estimates].reverse().map((e, i) => `${x(points.length + estimates.length - 1 - i)},${y(e.low)}`),
        ].join(" ")
      : "";
  const labels = new Set(labelIndexes(total, width < 400 ? 3 : width < 640 ? 4 : 7));
  const all = [...points.map((p) => ({ key: p.key, axisLabel: p.axisLabel })), ...estimates];
  const activePoint = current < points.length ? points[current] : null;
  const activeEstimate = current >= points.length ? estimates[current - points.length] : null;
  const activeX = x(current);
  const activeY = activePoint?.value != null ? y(activePoint.value) : activeEstimate ? y(activeEstimate.value) : null;

  function onPointer(event: PointerEvent<SVGSVGElement>) {
    const offset = event.clientX - event.currentTarget.getBoundingClientRect().left - MARGIN.left;
    setActive(Math.min(total - 1, Math.max(0, Math.round(offset / step))));
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: total - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(Math.min(total - 1, Math.max(0, moves[event.key])));
  }

  return (
    <div className="metric-chart">
      <div className="metric-chart-readout" id={readoutId} aria-live="polite">
        <span className="metric-chart-when">{activePoint?.title ?? activeEstimate?.title}</span>
        <span className="metric-chart-value">
          {activePoint
            ? activePoint.value === null
              ? "—"
              : format(activePoint.value)
            : activeEstimate
              ? `≈ ${format(activeEstimate.value)}`
              : "—"}
        </span>
        {activePoint && activePoint.previous !== null ? (
          <span className="metric-chart-previous">Anterior {format(activePoint.previous)}</span>
        ) : null}
        {activeEstimate ? (
          <span className="metric-chart-previous">
            Entre {format(activeEstimate.low)} y {format(activeEstimate.high)}
          </span>
        ) : null}
      </div>
      <div className="metric-chart-canvas" ref={ref}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={summary}
          aria-describedby={readoutId}
          tabIndex={0}
          className="metric-chart-svg"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="metric-chart-fill-top" />
              <stop offset="100%" className="metric-chart-fill-bottom" />
            </linearGradient>
          </defs>
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line className="metric-chart-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
              <text className="metric-chart-axis" x={MARGIN.left - 10} y={y(tick)} dy="0.32em" textAnchor="end">
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          {band ? <polygon className="metric-chart-band" points={band} /> : null}
          {previous.length > 1 ? <path className="metric-chart-previous-line" d={smoothPath(previous)} /> : null}
          <g key={metricKey}>
            {area ? <path className="metric-chart-area" d={area} fill={`url(#${gradientId})`} /> : null}
            {line ? <path className="metric-chart-line" d={line} pathLength={1} /> : null}
          </g>
          {partial ? <circle className="metric-chart-partial" cx={partial.x} cy={partial.y} r={3.5} /> : null}
          {estimateLine ? <path className="metric-chart-estimate" d={estimateLine} /> : null}
          {active !== null ? (
            <line className="metric-chart-crosshair" x1={activeX} x2={activeX} y1={MARGIN.top} y2={baseline} />
          ) : null}
          {activeY !== null ? (
            <circle
              className={`metric-chart-dot${activeEstimate ? " metric-chart-dot-estimate" : ""}`}
              cx={activeX}
              cy={activeY}
              r={4.5}
            />
          ) : null}
          {all.map((item, index) =>
            labels.has(index) ? (
              <text
                key={item.key}
                className="metric-chart-axis"
                x={x(index)}
                y={height - 8}
                textAnchor={index === 0 ? "start" : index === total - 1 ? "end" : "middle"}
              >
                {item.axisLabel}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}
