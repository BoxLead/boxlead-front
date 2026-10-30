import i18next from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedNumber } from "../../../components/ui/AnimatedNumber";
import { cx } from "../../../util/classNames";
import { formatNumber, formatPercent } from "../../../util/format";
import type { FunnelStep } from "../funnel";
import { layoutFunnel } from "./funnelLayout";
import { useElementWidth } from "./useElementWidth";
import "./FunnelChart.css";

const RADIUS = 6;
const GHOST_MARGIN = 5;

type FunnelChartProps = {
  steps: FunnelStep[];
};

function describe(steps: FunnelStep[], index: number | null): string {
  const last = steps[steps.length - 1];
  if (index === null) {
    return i18next.t("funnel.summary", {
      ns: "metrics",
      leads: formatNumber(steps[0].value),
      reached: formatNumber(last.value),
      stage: last.noun,
      share: formatPercent(last.fromStart),
    });
  }
  const step = steps[index];
  if (index === 0) {
    return i18next.t("funnel.first", { ns: "metrics", value: formatNumber(step.value), previous: formatNumber(step.previous) });
  }
  const before = steps[index - 1];
  const dropped = before.value - step.value;
  const progress = i18next.t("funnel.progress", {
    ns: "metrics",
    share: formatPercent(step.fromPrevious),
    stage: before.noun,
    dropped: formatNumber(dropped),
  });
  return step.explanation ? `${progress}. ${step.explanation}` : progress;
}

export function FunnelChart({ steps }: FunnelChartProps) {
  const { t } = useTranslation("metrics");
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const height = width < 520 ? 130 : 160;
  const layout = layoutFunnel(
    steps.map((step) => step.value),
    steps.map((step) => step.previous),
    width,
    height,
  );

  return (
    <div className={cx("funnel-chart", active !== null && "funnel-chart-focused")} onPointerLeave={() => setActive(null)}>
      <p className="funnel-chart-readout">{describe(steps, active)}</p>
      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>
      <div className="funnel-chart-stages">
        {steps.map((step, index) => (
          <button
            key={step.key}
            type="button"
            className={cx("funnel-chart-stage", active === index && "funnel-chart-stage-active")}
            onPointerEnter={() => setActive(index)}
            onFocus={() => {
              setActive(index);
              setAnnouncement(`${step.label}, ${formatNumber(step.value)}. ${describe(steps, index)}`);
            }}
            onBlur={() => setActive(null)}
            onClick={() => setActive(index)}
          >
            <span className="funnel-chart-label">{step.label}</span>
            <AnimatedNumber className="funnel-chart-value" value={step.value} format={formatNumber} />
            <span className="funnel-chart-share">{index === 0 ? t("funnel.total") : t("funnel.ofTotal", { share: formatPercent(step.fromStart) })}</span>
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
          <g className="funnel-chart-shapes">
            {layout.bars.map((bar, index) => {
              const ghost = layout.ghosts[index];
              return (
                <g key={steps[index].key} className="funnel-chart-shape" onPointerEnter={() => setActive(index)}>
                  <rect
                    className="funnel-chart-ghost"
                    x={ghost.x - GHOST_MARGIN}
                    y={ghost.y}
                    width={ghost.width + GHOST_MARGIN * 2}
                    height={ghost.height}
                    rx={RADIUS}
                  />
                  <rect
                    className={cx("funnel-chart-bar", active === index && "funnel-chart-bar-active")}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    rx={RADIUS}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <ul className="funnel-chart-legend" aria-hidden="true">
        <li>
          <span className="funnel-chart-swatch" />
          {t("legend.current")}
        </li>
        <li>
          <span className="funnel-chart-swatch funnel-chart-swatch-previous" />
          {t("legend.previous")}
        </li>
      </ul>
    </div>
  );
}
