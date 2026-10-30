import i18next from "i18next";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formatShortDate } from "../../util/format";
import { buildChartData } from "./chartData";
import { MetricChart } from "./charts/MetricChart";
import { MetricTabs } from "./MetricTabs";
import { FORECAST_DAYS, type MetricsView } from "./metricsView";
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
  return i18next.t("performance.leadCount", { ns: "metrics", count: Math.round(value), value: text });
}

export function Performance({ view, metric, onMetricChange }: PerformanceProps) {
  const { t } = useTranslation("metrics");
  const panelId = useId();
  const chart = buildChartData(view, metric);
  const { definition } = chart;
  const label = t(`indicators.${definition.key}`);

  return (
    <section className="panel performance" aria-label={t("performance.label")}>
      <MetricTabs
        panelId={panelId}
        selected={metric}
        current={view.current}
        previous={view.previous}
        onSelect={onMetricChange}
      />
      <div className="performance-panel" role="tabpanel" id={panelId} aria-label={label}>
        <MetricChart
          drawKey={chart.drawKey}
          points={chart.points}
          estimates={chart.estimates}
          partialLast={chart.partialLast}
          format={(value) => readout(definition, value)}
          formatAxis={(value) => formatMetric(definition, value)}
          summary={t(chart.weekly ? "performance.summaryWeek" : "performance.summaryDay", {
            metric: label,
            from: formatShortDate(view.from),
            to: formatShortDate(view.to),
          })}
        />
        <ul className="performance-legend" aria-label={t("performance.legend")}>
          <li>
            <span className="performance-swatch" aria-hidden="true" />
            {t("legend.current")}
          </li>
          <li>
            <span className="performance-swatch performance-swatch-previous" aria-hidden="true" />
            {t("legend.previous")}
          </li>
          {chart.forecastTotal !== null ? (
            <li>
              <span className="performance-swatch performance-swatch-estimate" aria-hidden="true" />
              {t("performance.forecast", { days: FORECAST_DAYS })}
              <strong>≈ {readout(definition, chart.forecastTotal)}</strong>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
