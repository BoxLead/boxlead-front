import type { PlatformType } from "../../api/types";
import { getPlatform } from "../../platforms";
import { addDays } from "../../util/dates";
import { formatCompactMoney, formatLongDate, formatNumber, formatShortDate } from "../../util/format";
import { DataTable } from "./charts/DataTable";
import { TrendChart, type TrendDatum } from "./charts/TrendChart";
import { weeklySeries, type SeriesPoint } from "./metricsModel";
import { MetricsSection } from "./MetricsSection";
import type { MetricsView } from "./useMetricsView";
import "./LeadTrend.css";

type LeadTrendProps = {
  view: MetricsView;
};

function parts(point: SeriesPoint, platforms: PlatformType[]) {
  return platforms.map((id) => {
    const platform = getPlatform(id);
    return { id, label: platform.name, colorClass: platform.colorClass, value: point.byPlatform[id] ?? 0 };
  });
}

export function LeadTrend({ view }: LeadTrendProps) {
  const weekly = view.period === 90;
  const current = weekly ? weeklySeries(view.daily) : view.daily;
  const previous = weekly ? weeklySeries(view.previousDaily) : view.previousDaily;
  const points = view.forecast?.points ?? [];
  const estimates = weekly
    ? [points.slice(0, 7), points.slice(7, 14)].filter((chunk) => chunk.length > 0).map((chunk) => ({
        date: chunk[0].date,
        days: chunk.length,
        value: chunk.reduce((sum, p) => sum + p.value, 0),
        low: chunk.reduce((sum, p) => sum + p.low, 0),
        high: chunk.reduce((sum, p) => sum + p.high, 0),
      }))
    : points.map((point) => ({ ...point, days: 1 }));

  const data: TrendDatum[] = [
    ...current.map((point, index) => ({
      key: point.date,
      axisLabel: formatShortDate(point.date),
      title: weekly
        ? `Del ${formatShortDate(point.date)} al ${formatShortDate(index + 1 < current.length ? addDays(current[index + 1].date, -1) : view.to)}`
        : `${formatLongDate(point.date)}${point.date === view.to ? " · hasta ahora" : ""}`,
      parts: parts(point, view.platforms),
      total: point.total,
      previous: previous[index]?.total ?? null,
      estimate: null,
    })),
    ...estimates.map((estimate) => ({
      key: `estimate-${estimate.date}`,
      axisLabel: formatShortDate(estimate.date),
      title: weekly
        ? `Del ${formatShortDate(estimate.date)} al ${formatShortDate(addDays(estimate.date, estimate.days - 1))} · estimación`
        : `${formatLongDate(estimate.date)} · estimación`,
      parts: [],
      total: 0,
      previous: null,
      estimate: { value: estimate.value, low: estimate.low, high: estimate.high },
    })),
  ];

  const best = current.reduce<SeriesPoint | null>((top, point) => (!top || point.total > top.total ? point : top), null);
  const forecast = view.forecast;
  const ticket = view.settings.averageTicket;
  const expectedSales = forecast && view.forecastCloseRate !== null ? forecast.total * view.forecastCloseRate : null;
  const lastDay = addDays(view.to, 14);

  return (
    <MetricsSection
      title="Evolución de leads"
      className="lead-trend"
      takeaway={
        best && best.total > 0 ? (
          <>
            El {weekly ? "mejor momento fue la semana del" : "mejor día fue el"} <strong>{formatShortDate(best.date)}</strong> con{" "}
            <strong>{formatNumber(best.total)} leads</strong>.
          </>
        ) : (
          "Todavía no hay leads en este período."
        )
      }
    >
      <TrendChart
        data={data}
        unit={["lead", "leads"]}
        summary={`Leads por ${weekly ? "semana" : "día"} y por canal entre el ${formatShortDate(view.from)} y el ${formatShortDate(view.to)}, comparados con el período anterior y con la estimación de los próximos 14 días.`}
      />

      {forecast ? (
        <div className="lead-forecast" aria-label="Estimación de los próximos 14 días" role="group">
          <div className="lead-forecast-head">
            <span className="lead-forecast-title">Próximos 14 días</span>
            <span className="lead-forecast-range">Hasta el {formatShortDate(lastDay)}</span>
          </div>
          <dl className="lead-forecast-figures">
            <div>
              <dt>Leads esperados</dt>
              <dd>
                ≈ {formatNumber(forecast.total)}
                <span>
                  entre {formatNumber(forecast.low)} y {formatNumber(forecast.high)}
                </span>
              </dd>
            </div>
            {expectedSales !== null ? (
              <div>
                <dt>Ventas esperadas</dt>
                <dd>≈ {formatNumber(expectedSales)}</dd>
              </div>
            ) : null}
            {expectedSales !== null && ticket !== null ? (
              <div>
                <dt>Ingresos esperados</dt>
                <dd>≈ {formatCompactMoney(expectedSales * ticket, view.settings.currency)}</dd>
              </div>
            ) : null}
          </dl>
          <p className="lead-forecast-note">
            Sale de la tendencia de las últimas 12 semanas y del patrón de cada día de la semana. El rango tiene 80% de
            confianza.
          </p>
        </div>
      ) : null}

      <DataTable
        caption="Leads por período y canal"
        columns={[weekly ? "Semana" : "Día", ...view.platforms.map((id) => getPlatform(id).name), "Total", "Período anterior"]}
        rows={current.map((point, index) => [
          formatShortDate(point.date),
          ...view.platforms.map((id) => formatNumber(point.byPlatform[id] ?? 0)),
          formatNumber(point.total),
          previous[index] ? formatNumber(previous[index].total) : "—",
        ])}
      />
    </MetricsSection>
  );
}
