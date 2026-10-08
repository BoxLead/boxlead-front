import { formatCompactMoney, formatDuration, formatNumber, formatPercent } from "../../util/format";
import { Meter } from "./charts/Meter";
import { Sparkline } from "./charts/Sparkline";
import { Delta } from "./Delta";
import { KpiCard } from "./KpiCard";
import { percentChange } from "./metricsModel";
import type { MetricsView } from "./useMetricsView";
import "./KpiGrid.css";

type KpiGridProps = {
  view: MetricsView;
  onEditSettings: () => void;
};

function pointsChange(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

export function KpiGrid({ view, onEditSettings }: KpiGridProps) {
  const { totals, previousTotals, rates, previousRates, settings } = view;
  const ticket = settings.averageTicket;
  const revenue = ticket === null ? null : totals.closed * ticket;
  const previousRevenue = ticket === null ? null : previousTotals.closed * ticket;

  return (
    <ul className="kpi-grid" aria-label="Indicadores principales">
      <KpiCard
        label="Leads nuevos"
        value={formatNumber(totals.leads)}
        delta={<Delta value={percentChange(totals.leads, previousTotals.leads)} />}
        visual={<Sparkline values={view.daily.map((point) => point.total)} />}
        caption={`${formatNumber(totals.conversations)} conversaciones`}
      />
      <KpiCard
        label="Respondidos en 5 min"
        value={formatPercent(rates.fastShare)}
        delta={<Delta value={pointsChange(rates.fastShare, previousRates.fastShare)} kind="points" />}
        visual={<Meter value={rates.fastShare} />}
        caption={`Primera respuesta en ${formatDuration(rates.medianSeconds)} (mediana)`}
      />
      <KpiCard
        label="Tasa de calificación"
        value={formatPercent(rates.qualification)}
        delta={<Delta value={pointsChange(rates.qualification, previousRates.qualification)} kind="points" />}
        visual={<Meter value={rates.qualification} />}
        caption={`${formatNumber(totals.qualified)} leads calificados`}
      />
      <KpiCard
        label="Ventas"
        value={formatNumber(totals.closed)}
        delta={<Delta value={percentChange(totals.closed, previousTotals.closed)} />}
        visual={<Meter value={rates.close} />}
        caption={`${formatPercent(rates.close, 1)} de los leads`}
      />
      <KpiCard
        label="Ingresos estimados"
        highlight
        value={revenue === null ? "—" : formatCompactMoney(revenue, settings.currency)}
        delta={
          revenue !== null && previousRevenue !== null ? (
            <Delta value={percentChange(revenue, previousRevenue)} />
          ) : null
        }
        caption={
          ticket === null ? (
            <button type="button" onClick={onEditSettings}>
              Cargá tu ticket promedio
            </button>
          ) : (
            <>
              Con un ticket de {formatCompactMoney(ticket, settings.currency)}.{" "}
              <button type="button" onClick={onEditSettings}>
                Cambiar
              </button>
            </>
          )
        }
      />
    </ul>
  );
}
