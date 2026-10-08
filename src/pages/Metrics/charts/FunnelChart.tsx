import { useState } from "react";
import { AnimatedNumber } from "../../../components/ui/AnimatedNumber";
import { cx } from "../../../util/classNames";
import { formatNumber, formatPercent } from "../../../util/format";
import type { FunnelStep } from "../breakdown";
import { layoutFunnel } from "./funnelLayout";
import { useElementWidth } from "./useElementWidth";
import "./FunnelChart.css";

type FunnelChartProps = {
  steps: FunnelStep[];
};

function describe(steps: FunnelStep[], index: number | null): string {
  const last = steps[steps.length - 1];
  if (index === null) {
    return `De ${formatNumber(steps[0].value)} leads, ${formatNumber(last.value)} llegaron a ${last.label.toLowerCase()} (${formatPercent(last.fromStart)})`;
  }
  const step = steps[index];
  if (index === 0) return `${formatNumber(step.value)} leads en el período, ${formatNumber(step.previous)} en el anterior`;
  const before = steps[index - 1];
  const dropped = before.value - step.value;
  return `${formatPercent(step.fromPrevious)} de los ${before.label.toLowerCase()} avanzó, ${formatNumber(dropped)} quedaron en el camino`;
}

export function FunnelChart({ steps }: FunnelChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const height = width < 520 ? 130 : 160;
  const layout = layoutFunnel(
    steps.map((step) => step.value),
    steps.map((step) => step.previous),
    width,
    height,
  );

  return (
    <div className={cx("funnel-chart", active !== null && "funnel-chart-focused")} onPointerLeave={() => setActive(null)}>
      <p className="funnel-chart-readout" aria-live="polite">
        {describe(steps, active)}
      </p>
      <div className="funnel-chart-stages">
        {steps.map((step, index) => (
          <button
            key={step.key}
            type="button"
            className={cx("funnel-chart-stage", active === index && "funnel-chart-stage-active")}
            onPointerEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(index)}
          >
            <span className="funnel-chart-label">{step.label}</span>
            <AnimatedNumber className="funnel-chart-value" value={step.value} format={formatNumber} />
            <span className="funnel-chart-share">{index === 0 ? "Total" : `${formatPercent(step.fromStart)} del total`}</span>
          </button>
        ))}
      </div>
      <div className="funnel-chart-canvas" ref={ref}>
        <svg width={width} height={height} aria-hidden="true" className="funnel-chart-svg">
          {layout.bands.map((band, index) => (
            <g
              key={steps[index + 1].key}
              className={cx("funnel-chart-flow", active === index + 1 && "funnel-chart-flow-active")}
              onPointerEnter={() => setActive(index + 1)}
            >
              <path className="funnel-chart-band" d={band} />
              <text className="funnel-chart-rate" x={layout.columnWidth * (index + 1)} y={layout.center} dy="0.35em" textAnchor="middle">
                {formatPercent(steps[index + 1].fromPrevious)}
              </text>
            </g>
          ))}
          {layout.ghosts.map((ghost, index) => (
            <rect
              key={`ghost-${steps[index].key}`}
              className="funnel-chart-ghost"
              x={ghost.x - 5}
              y={ghost.y}
              width={ghost.width + 10}
              height={ghost.height}
              rx={6}
            />
          ))}
          {layout.bars.map((bar, index) => (
            <rect
              key={steps[index].key}
              className={cx("funnel-chart-bar", active === index && "funnel-chart-bar-active")}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={6}
              onPointerEnter={() => setActive(index)}
            />
          ))}
        </svg>
      </div>
      <ul className="funnel-chart-legend" aria-hidden="true">
        <li>
          <span className="funnel-chart-swatch" />
          Este período
        </li>
        <li>
          <span className="funnel-chart-swatch funnel-chart-swatch-previous" />
          Anterior
        </li>
      </ul>
    </div>
  );
}
