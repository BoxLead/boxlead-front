import { useId, useRef, type KeyboardEvent } from "react";
import { formatCompactMoney, formatLongDate, formatNumber, formatPercent, formatShortDate } from "../../util/format";
import { Change } from "./Change";
import { MetricChart, type ChartEstimate, type ChartPoint } from "./charts/MetricChart";
import { formatMetric, metricChange, metricSeries, METRICS, type MetricDefinition, type MetricKey } from "./series";
import type { MetricsView } from "./useMetricsView";
import "./Performance.css";

type PerformanceProps = {
  view: MetricsView;
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  onEditSettings: () => void;
};

function withUnit(definition: MetricDefinition, value: number, currency: string): string {
  const text = formatMetric(definition, value, currency);
  if (definition.kind !== "count") return text;
  return `${text} ${Math.round(value) === 1 ? definition.unit[0] : definition.unit[1]}`;
}

function axis(definition: MetricDefinition, value: number, currency: string): string {
  if (definition.kind === "rate") return formatPercent(value);
  if (definition.kind === "money") return formatCompactMoney(value, currency).replace(/\s/g, "");
  return formatNumber(value);
}

export function Performance({ view, metric, onMetricChange, onEditSettings }: PerformanceProps) {
  const panelId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const definition = METRICS.find((item) => item.key === metric) ?? METRICS[0];
  const { settings } = view;
  const ticket = settings.averageTicket;
  const weekly = view.period === 90;
  const lookback = [...view.previousDays, ...view.days];
  const current = metricSeries(metric, lookback, view.from, view.to, weekly, ticket);
  const previous = metricSeries(metric, view.previousDays, view.previousFrom, view.previousTo, weekly, ticket);
  const forecast = definition.forecast ? view.forecasts[metric] : undefined;
  const missingTicket = metric === "revenue" && ticket === null;

  const points: ChartPoint[] = current.map((point, index) => ({
    key: point.date,
    axisLabel: formatShortDate(point.date),
    title: weekly
      ? `${formatShortDate(point.date)} al ${formatShortDate(point.end)}`
      : `${formatLongDate(point.date)}${point.date === view.to ? ", hasta ahora" : ""}`,
    value: point.value,
    previous: previous[index]?.value ?? null,
  }));

  const forecastPoints = forecast?.points ?? [];
  const estimates: ChartEstimate[] = weekly
    ? [forecastPoints.slice(0, 7), forecastPoints.slice(7, 14)]
        .filter((chunk) => chunk.length > 0)
        .map((chunk) => ({
          key: `estimate-${chunk[0].date}`,
          axisLabel: formatShortDate(chunk[0].date),
          title: `${formatShortDate(chunk[0].date)} al ${formatShortDate(chunk[chunk.length - 1].date)}, estimado`,
          value: chunk.reduce((sum, p) => sum + p.value, 0),
          low: chunk.reduce((sum, p) => sum + p.low, 0),
          high: chunk.reduce((sum, p) => sum + p.high, 0),
        }))
    : forecastPoints.map((point) => ({
        key: `estimate-${point.date}`,
        axisLabel: formatShortDate(point.date),
        title: `${formatLongDate(point.date)}, estimado`,
        value: point.value,
        low: point.low,
        high: point.high,
      }));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = METRICS.findIndex((item) => item.key === metric);
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % METRICS.length,
      ArrowLeft: (index - 1 + METRICS.length) % METRICS.length,
      Home: 0,
      End: METRICS.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = METRICS[moves[event.key]];
    onMetricChange(next.key);
    tabsRef.current?.querySelector<HTMLButtonElement>(`[data-metric="${next.key}"]`)?.focus();
  }

  return (
    <section className="performance" aria-label="Rendimiento del período">
      <div className="performance-tabs" role="tablist" aria-label="Indicadores" ref={tabsRef} onKeyDown={onKeyDown}>
        {METRICS.map((item) => {
          const selected = item.key === metric;
          const value = view.current[item.key];
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              data-metric={item.key}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              className={`performance-tab${selected ? " performance-tab-selected" : ""}`}
              onClick={() => onMetricChange(item.key)}
            >
              <span className="performance-tab-label">{item.label}</span>
              <span className="performance-tab-value">{formatMetric(item, value, settings.currency)}</span>
              <Change
                value={metricChange(item, value, view.previous[item.key])}
                kind={item.kind === "rate" ? "points" : "percent"}
              />
            </button>
          );
        })}
      </div>

      <div className="performance-panel" role="tabpanel" id={panelId} aria-label={definition.label}>
        {missingTicket ? (
          <div className="performance-empty">
            <p>Cargá tu ticket promedio para estimar los ingresos.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onEditSettings}>
              Cargar ticket
            </button>
          </div>
        ) : (
          <MetricChart
            metricKey={metric}
            points={points}
            estimates={estimates}
            format={(value) => withUnit(definition, value, settings.currency)}
            formatAxis={(value) => axis(definition, value, settings.currency)}
            summary={`${definition.label} por ${weekly ? "semana" : "día"} del ${formatShortDate(view.from)} al ${formatShortDate(view.to)}, comparado con el período anterior.`}
            partialLast={!weekly && definition.kind !== "rate"}
          />
        )}
        <ul className="performance-legend" aria-label="Referencias">
          <li>
            <span className="performance-swatch performance-swatch-current" aria-hidden="true" />
            Este período
          </li>
          <li>
            <span className="performance-swatch performance-swatch-previous" aria-hidden="true" />
            Anterior
          </li>
          {forecast && !missingTicket ? (
            <li>
              <span className="performance-swatch performance-swatch-estimate" aria-hidden="true" />
              Próximos 14 días
              <strong>≈ {withUnit(definition, forecast.total, settings.currency)}</strong>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
