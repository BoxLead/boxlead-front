import { useRef, type KeyboardEvent } from "react";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { cx } from "../../util/classNames";
import { Change } from "./Change";
import { formatMetric, metricChange, METRICS, type MetricKey } from "./series";
import "./MetricTabs.css";

type MetricTabsProps = {
  panelId: string;
  selected: MetricKey;
  current: Record<MetricKey, number | null>;
  previous: Record<MetricKey, number | null>;
  onSelect: (metric: MetricKey) => void;
};

const KEY_MOVES: Record<string, (index: number) => number> = {
  ArrowRight: (index) => (index + 1) % METRICS.length,
  ArrowLeft: (index) => (index - 1 + METRICS.length) % METRICS.length,
  Home: () => 0,
  End: () => METRICS.length - 1,
};

export function MetricTabs({ panelId, selected, current, previous, onSelect }: MetricTabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, METRICS.findIndex((metric) => metric.key === selected));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = KEY_MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    const next = METRICS[move(selectedIndex)];
    onSelect(next.key);
    ref.current?.querySelector<HTMLButtonElement>(`[data-metric="${next.key}"]`)?.focus();
  }

  return (
    <div className="metric-tabs" role="tablist" aria-label="Indicadores" ref={ref} onKeyDown={onKeyDown}>
      {METRICS.map((metric) => {
        const active = metric.key === selected;
        return (
          <button
            key={metric.key}
            type="button"
            role="tab"
            data-metric={metric.key}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            className={cx("metric-tab", active && "metric-tab-selected")}
            onClick={() => onSelect(metric.key)}
          >
            <span className="metric-tab-label">{metric.label}</span>
            <AnimatedNumber
              className="metric-tab-value"
              value={current[metric.key]}
              format={(value) => formatMetric(metric, value)}
            />
            <Change
              value={metricChange(metric, current[metric.key], previous[metric.key])}
              kind={metric.kind === "rate" ? "points" : "percent"}
              better={metric.better}
            />
          </button>
        );
      })}
    </div>
  );
}
