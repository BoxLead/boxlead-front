import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { layoutChart, MARGIN, type ChartEstimate, type ChartPoint } from "./chartLayout";
import { useElementWidth } from "./useElementWidth";
import "./MetricChart.css";

export type { ChartEstimate, ChartPoint } from "./chartLayout";

type MetricChartProps = {
  drawKey: string;
  points: ChartPoint[];
  estimates: ChartEstimate[];
  format: (value: number) => string;
  formatAxis: (value: number) => string;
  summary: string;
  partialLast: boolean;
};

export function MetricChart({ drawKey, points, estimates, format, formatAxis, summary, partialLast }: MetricChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const gradientId = `metric-fill-${useId().replace(/:/g, "")}`;
  const readoutId = useId();
  const [active, setActive] = useState<number | null>(null);
  const height = width < 560 ? 220 : 300;
  const chart = layoutChart({ points, estimates, width, height, partialLast });
  const current = Math.min(active ?? chart.defaultIndex, chart.total - 1);
  const point = current < points.length ? points[current] : null;
  const estimate = point ? null : estimates[current - points.length];
  const value = point ? point.value : (estimate?.value ?? null);
  const focusX = chart.x(current);

  function onPointer(event: PointerEvent<SVGSVGElement>) {
    setActive(chart.indexAt(event.clientX - event.currentTarget.getBoundingClientRect().left));
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: chart.total - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(Math.min(chart.total - 1, Math.max(0, moves[event.key])));
  }

  return (
    <div className="metric-chart">
      <div className="metric-chart-readout" id={readoutId} aria-live="polite">
        <span className="metric-chart-when">{point?.title ?? estimate?.title}</span>
        <span className="metric-chart-value">
          {value === null ? "—" : `${estimate ? "≈ " : ""}${format(value)}`}
        </span>
        {point && point.previous !== null ? (
          <span className="metric-chart-aside">Anterior {format(point.previous)}</span>
        ) : null}
        {estimate ? (
          <span className="metric-chart-aside">
            Entre {format(estimate.low)} y {format(estimate.high)}
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
          className={`metric-chart-svg${active === null ? "" : " metric-chart-svg-active"}`}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="metric-chart-fill-top" />
              <stop offset="100%" className="metric-chart-fill-bottom" />
            </linearGradient>
          </defs>

          {chart.ticks.map((tick) => (
            <g key={tick}>
              <line className="metric-chart-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={chart.y(tick)} y2={chart.y(tick)} />
              <text className="metric-chart-axis" x={MARGIN.left - 10} y={chart.y(tick)} dy="0.32em" textAnchor="end">
                {formatAxis(tick)}
              </text>
            </g>
          ))}

          {chart.previous ? <path className="metric-chart-previous" d={chart.previous} /> : null}

          <g key={drawKey}>
            {chart.area ? <path className="metric-chart-area" d={chart.area} fill={`url(#${gradientId})`} /> : null}
            {chart.line ? <path className="metric-chart-line" d={chart.line} pathLength={1} /> : null}
            {chart.band ? <polygon className="metric-chart-band" points={chart.band} /> : null}
            {chart.estimate ? <path className="metric-chart-estimate" d={chart.estimate} /> : null}
          </g>

          {chart.partial ? (
            <g className="metric-chart-live">
              <circle className="metric-chart-live-ring" cx={chart.partial.x} cy={chart.partial.y} r={4} />
              <circle className="metric-chart-live-dot" cx={chart.partial.x} cy={chart.partial.y} r={3.5} />
            </g>
          ) : null}

          <g className="metric-chart-crosshair" transform={`translate(${focusX} 0)`}>
            <line y1={MARGIN.top} y2={chart.baseline} />
          </g>
          {point && point.previous !== null ? (
            <circle className="metric-chart-dot-previous" cx={focusX} cy={chart.y(point.previous)} r={3} />
          ) : null}
          {value !== null ? (
            <circle
              className={`metric-chart-dot${estimate ? " metric-chart-dot-estimate" : ""}`}
              cx={focusX}
              cy={chart.y(value)}
              r={4.5}
            />
          ) : null}

          {[...points, ...estimates].map((item, index) =>
            chart.labels.has(index) ? (
              <text
                key={item.key}
                className="metric-chart-axis"
                x={chart.x(index)}
                y={height - 8}
                textAnchor={index === 0 ? "start" : index === chart.total - 1 ? "end" : "middle"}
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
