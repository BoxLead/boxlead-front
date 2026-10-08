import { useId, useState, type KeyboardEvent } from "react";
import { formatNumber } from "../../../util/format";
import { labelIndexes, niceMax, ticks } from "./scale";
import { useElementWidth } from "./useElementWidth";
import "./TrendChart.css";

export type TrendPart = {
  id: string;
  label: string;
  colorClass: string;
  value: number;
};

export type TrendDatum = {
  key: string;
  axisLabel: string;
  title: string;
  parts: TrendPart[];
  total: number;
  previous: number | null;
  estimate: { value: number; low: number; high: number } | null;
};

type TrendChartProps = {
  data: TrendDatum[];
  unit: [string, string];
  summary: string;
};

const MARGIN = { top: 14, right: 6, bottom: 26, left: 38 };

function unitLabel(value: number, [one, many]: [string, string]): string {
  return `${formatNumber(value)} ${Math.round(value) === 1 ? one : many}`;
}

export function TrendChart({ data, unit, summary }: TrendChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const readoutId = useId();
  const lastActual = data.reduce((last, datum, index) => (datum.estimate ? last : index), 0);
  const [active, setActive] = useState<number | null>(null);
  const current = active ?? lastActual;
  const height = width < 520 ? 200 : 260;
  const innerWidth = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const band = innerWidth / Math.max(1, data.length);
  const barWidth = Math.max(2, Math.min(28, band * 0.66));
  const max = niceMax(
    Math.max(0, ...data.map((d) => Math.max(d.total, d.previous ?? 0, d.estimate?.high ?? 0))),
  );
  const y = (value: number) => MARGIN.top + innerHeight - (value / max) * innerHeight;
  const center = (index: number) => MARGIN.left + band * index + band / 2;
  const labels = new Set(labelIndexes(data.length, width < 400 ? 3 : width < 640 ? 4 : 7));
  const previousPath = data
    .map((datum, index) => (datum.previous === null ? null : `${center(index)},${y(datum.previous)}`))
    .filter((point): point is string => point !== null);
  const firstEstimate = data.findIndex((datum) => datum.estimate !== null);
  const legend = data[lastActual]?.parts ?? [];
  const hasPrevious = previousPath.length > 1;
  const datum = data[current];

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      setActive(Math.min(data.length - 1, Math.max(0, current + step)));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : data.length - 1);
    }
  }

  return (
    <div className="trend">
      <div className="trend-readout" id={readoutId} aria-live="polite">
        {datum ? (
          <>
            <span className="trend-readout-title">{datum.title}</span>
            {datum.estimate ? (
              <span className="trend-readout-total">
                ≈ {unitLabel(datum.estimate.value, unit)}
                <span className="trend-readout-muted">
                  {" "}
                  entre {formatNumber(datum.estimate.low)} y {formatNumber(datum.estimate.high)}
                </span>
              </span>
            ) : (
              <span className="trend-readout-total">{unitLabel(datum.total, unit)}</span>
            )}
            {datum.parts.filter((part) => part.value > 0).map((part) => (
              <span key={part.id} className={`trend-readout-part ${part.colorClass}`}>
                <span className="trend-dot" aria-hidden="true" />
                {part.label} {formatNumber(part.value)}
              </span>
            ))}
            {datum.previous !== null ? (
              <span className="trend-readout-muted">Período anterior {formatNumber(datum.previous)}</span>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="trend-canvas" ref={ref}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={summary}
          aria-describedby={readoutId}
          tabIndex={0}
          className="trend-svg"
          onKeyDown={onKeyDown}
          onPointerLeave={() => setActive(null)}
        >
          {ticks(max).map((tick) => (
            <g key={tick}>
              <line className="trend-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
              <text className="trend-axis" x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {formatNumber(tick)}
              </text>
            </g>
          ))}

          {active !== null ? (
            <rect
              className="trend-hover"
              x={MARGIN.left + band * active}
              y={MARGIN.top}
              width={band}
              height={innerHeight}
              rx={4}
            />
          ) : null}

          {data.map((item, index) => {
            const x = center(index) - barWidth / 2;
            let base = MARGIN.top + innerHeight;
            return (
              <g key={item.key}>
                {item.parts.map((part) => {
                  const h = (part.value / max) * innerHeight;
                  base -= h;
                  return h > 0 ? (
                    <rect
                      key={part.id}
                      className={`trend-part ${part.colorClass}`}
                      x={x}
                      y={base}
                      width={barWidth}
                      height={h}
                    />
                  ) : null;
                })}
                {item.estimate ? (
                  <g className="trend-estimate">
                    <rect
                      x={x}
                      y={y(item.estimate.value)}
                      width={barWidth}
                      height={MARGIN.top + innerHeight - y(item.estimate.value)}
                      rx={2}
                    />
                    <line
                      x1={center(index)}
                      x2={center(index)}
                      y1={y(item.estimate.high)}
                      y2={y(item.estimate.low)}
                    />
                  </g>
                ) : null}
              </g>
            );
          })}

          {hasPrevious ? <polyline className="trend-previous" points={previousPath.join(" ")} /> : null}

          {firstEstimate > 0 ? (
            <g className="trend-today">
              <line
                x1={MARGIN.left + band * firstEstimate}
                x2={MARGIN.left + band * firstEstimate}
                y1={MARGIN.top - 4}
                y2={MARGIN.top + innerHeight}
              />
              <text x={MARGIN.left + band * firstEstimate + 4} y={MARGIN.top + 6}>
                Estimación
              </text>
            </g>
          ) : null}

          {data.map((item, index) =>
            labels.has(index) ? (
              <text
                key={item.key}
                className="trend-axis"
                x={center(index)}
                y={height - 8}
                textAnchor={index === data.length - 1 ? "end" : "middle"}
              >
                {item.axisLabel}
              </text>
            ) : null,
          )}

          {data.map((item, index) => (
            <rect
              key={item.key}
              className="trend-hit"
              x={MARGIN.left + band * index}
              y={MARGIN.top}
              width={band}
              height={innerHeight}
              onPointerEnter={() => setActive(index)}
              onPointerDown={() => setActive(index)}
            />
          ))}
        </svg>
      </div>

      <ul className="trend-legend" aria-label="Referencias">
        {legend.map((part) => (
          <li key={part.id} className={part.colorClass}>
            <span className="trend-dot" aria-hidden="true" />
            {part.label}
          </li>
        ))}
        {hasPrevious ? (
          <li>
            <span className="trend-swatch-previous" aria-hidden="true" />
            Período anterior
          </li>
        ) : null}
        {firstEstimate > 0 ? (
          <li>
            <span className="trend-swatch-estimate" aria-hidden="true" />
            Estimación
          </li>
        ) : null}
      </ul>
    </div>
  );
}
