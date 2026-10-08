import { formatDuration, formatNumber, formatPercent, formatTimes } from "../../util/format";
import { FAST_RESPONSE_BUCKETS, RESPONSE_BUCKETS } from "../../util/metrics";
import { DataTable } from "./charts/DataTable";
import { Meter } from "./charts/Meter";
import { estimateMedianSeconds, ratio, speedBands, speedRows } from "./metricsModel";
import { MetricsSection } from "./MetricsSection";
import type { MetricsView } from "./useMetricsView";
import "./SpeedPanel.css";

type SpeedPanelProps = {
  view: MetricsView;
};

const MIN_BAND_SAMPLE = 30;

function stack(buckets: number[]) {
  const total = buckets.reduce((sum, value) => sum + value, 0);
  let start = 0;
  return buckets
    .map((value, index) => {
      const width = total > 0 ? (value / total) * 100 : 0;
      const part = { index, start, width };
      start += width;
      return part;
    })
    .filter((part) => part.width > 0);
}

export function SpeedPanel({ view }: SpeedPanelProps) {
  const { firstResponse } = view.totals;
  const rows = speedRows(firstResponse);
  const bands = speedBands(firstResponse);
  const responders = [
    ...(view.totals.agent ? [{ label: "Agente", buckets: firstResponse.agent }] : []),
    { label: "Tu equipo", buckets: firstResponse.human },
  ]
    .map((responder) => ({ ...responder, total: responder.buckets.reduce((sum, value) => sum + value, 0) }))
    .filter((responder) => responder.total > 0);
  const fast = bands[0];
  const slow = bands[bands.length - 1];
  const comparable =
    fast.rate !== null && slow.rate !== null && slow.rate > 0 && slow.answered >= MIN_BAND_SAMPLE && fast.answered >= MIN_BAND_SAMPLE;

  return (
    <MetricsSection
      title="Velocidad de respuesta"
      takeaway={
        <>
          La primera respuesta llega en <strong>{formatDuration(view.rates.medianSeconds)}</strong> (mediana).
          {comparable ? (
            <>
              {" "}
              Responder en menos de 5 minutos califica <strong>{formatTimes((fast.rate ?? 0) / (slow.rate ?? 1))} más</strong>{" "}
              que hacerlo después de una hora.
            </>
          ) : null}
        </>
      }
    >
      <div className="speed-compare">
        {responders.map((responder) => (
          <div key={responder.label} className="speed-responder">
            <div className="speed-responder-head">
              <span className="speed-responder-name">{responder.label}</span>
              <span className="speed-responder-median">
                Mediana <strong>{formatDuration(estimateMedianSeconds(responder.buckets))}</strong>
              </span>
            </div>
            <svg className="speed-stack" width="100%" height={14} aria-hidden="true">
              {stack(responder.buckets).map((part) => (
                <rect
                  key={part.index}
                  className={`speed-b${part.index}`}
                  x={`${part.start}%`}
                  width={`${part.width}%`}
                  height={14}
                />
              ))}
            </svg>
            <span className="speed-responder-foot">
              {formatNumber(responder.total)} conversaciones,{" "}
              {formatPercent(ratio(responder.buckets.slice(0, FAST_RESPONSE_BUCKETS).reduce((a, b) => a + b, 0), responder.total))}{" "}
              en menos de 5 minutos
            </span>
          </div>
        ))}
        <ul className="speed-legend" aria-label="Tiempo hasta la primera respuesta">
          {RESPONSE_BUCKETS.map((bucket, index) => (
            <li key={bucket.short}>
              <span className={`speed-swatch speed-b${index}`} aria-hidden="true" />
              {bucket.short}
            </li>
          ))}
        </ul>
        {view.totals.firstResponse.unanswered > 0 ? (
          <p className="speed-unanswered">
            {view.totals.firstResponse.unanswered === 1
              ? "1 conversación sigue sin respuesta."
              : `${formatNumber(view.totals.firstResponse.unanswered)} conversaciones siguen sin respuesta.`}
          </p>
        ) : null}
      </div>

      <div className="speed-bands">
        <h3 className="speed-bands-title">Calificación según la velocidad</h3>
        <ul>
          {bands.map((band, index) => (
            <li key={band.label} className={`speed-band speed-band-${index}`}>
              <div className="speed-band-head">
                <span>{band.label}</span>
                <strong>{band.answered >= MIN_BAND_SAMPLE ? formatPercent(band.rate) : "Pocos datos"}</strong>
              </div>
              <Meter value={band.answered >= MIN_BAND_SAMPLE ? band.rate : 0} />
              <span className="speed-band-sample">{formatNumber(band.answered)} conversaciones</span>
            </li>
          ))}
        </ul>
      </div>

      <DataTable
        caption="Conversaciones por tiempo de primera respuesta"
        columns={["Primera respuesta", "Agente", "Tu equipo", "Calificados"]}
        rows={rows.map((row) => [
          RESPONSE_BUCKETS[row.index].label,
          formatNumber(row.agent),
          formatNumber(row.human),
          formatPercent(row.conversion),
        ])}
      />
    </MetricsSection>
  );
}
