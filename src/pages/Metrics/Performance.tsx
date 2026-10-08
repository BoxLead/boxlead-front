import { useId } from "react";
import { formatDuration, formatNumber, formatPercent, formatShortDate } from "../../util/format";
import { buildChartData } from "./chartData";
import { MetricChart } from "./charts/MetricChart";
import { MetricTabs } from "./MetricTabs";
import type { MetricsView } from "./metricsView";
import { formatMetric, type MetricDefinition, type MetricKey } from "./series";
import "./Performance.css";

type PerformanceProps = {
  view: MetricsView;
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
};

function readout(definition: MetricDefinition, value: number): string {
  const text = formatMetric(definition, value);
  if (definition.kind !== "count") return text;
  return `${text} ${Math.round(value) === 1 ? "lead" : "leads"}`;
}

function axisLabel(definition: MetricDefinition, value: number): string {
  if (definition.kind === "rate") return formatPercent(value);
  if (definition.kind === "duration") return formatDuration(value);
  return formatNumber(value);
}

export function Performance({ view, metric, onMetricChange }: PerformanceProps) {
  const panelId = useId();
  const chart = buildChartData(view, metric);
  const { definition } = chart;

  return (
    <section className="panel performance" aria-label="Rendimiento del período">
      <MetricTabs
        panelId={panelId}
        selected={metric}
        current={view.current}
        previous={view.previous}
        onSelect={onMetricChange}
      />
      <div className="performance-panel" role="tabpanel" id={panelId} aria-label={definition.label}>
        <MetricChart
          drawKey={chart.drawKey}
          points={chart.points}
          estimates={chart.estimates}
          partialLast={chart.partialLast}
          format={(value) => readout(definition, value)}
          formatAxis={(value) => axisLabel(definition, value)}
          summary={`${definition.label} por ${chart.weekly ? "semana" : "día"} del ${formatShortDate(view.from)} al ${formatShortDate(view.to)}, comparado con el período anterior.`}
        />
        <ul className="performance-legend" aria-label="Referencias">
          <li>
            <span className="performance-swatch" aria-hidden="true" />
            Este período
          </li>
          <li>
            <span className="performance-swatch performance-swatch-previous" aria-hidden="true" />
            Anterior
          </li>
          {chart.forecastTotal !== null ? (
            <li>
              <span className="performance-swatch performance-swatch-estimate" aria-hidden="true" />
              Próximos 14 días
              <strong>≈ {readout(definition, chart.forecastTotal)}</strong>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
