import { useState } from "react";
import { formatNumber, formatTimes } from "../../util/format";
import { businessHoursLabel, isWithinBusinessHours, WEEKDAYS, WEEKDAYS_SHORT } from "../../util/metrics";
import { DataTable } from "./charts/DataTable";
import { heatLevels, peakWindow } from "./metricsModel";
import { MetricsSection } from "./MetricsSection";
import type { MetricsView } from "./useMetricsView";
import "./Heatmap.css";

type HeatmapProps = {
  view: MetricsView;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const BLOCKS = Array.from({ length: 8 }, (_, block) => block * 3);

export function Heatmap({ view }: HeatmapProps) {
  const hourly = view.totals.inboundByHour;
  const levels = heatLevels(hourly);
  const peak = peakWindow(hourly);
  const total = hourly.reduce((sum, value) => sum + value, 0);
  const hours = view.settings.businessHours;
  const [hovered, setHovered] = useState<number | null>(null);
  const average = (total * 3) / 168;

  const readout =
    hovered !== null
      ? `${WEEKDAYS[Math.floor(hovered / 24)]} de ${hovered % 24} a ${(hovered % 24) + 1} h · ${formatNumber(hourly[hovered])} mensajes`
      : peak
        ? `Pico ${WEEKDAYS[peak.weekday].toLowerCase()} de ${peak.from} a ${peak.to} h · ${formatNumber(peak.share * total)} mensajes`
        : "Sin mensajes en este período";

  return (
    <MetricsSection
      title="¿Cuándo te escriben?"
      takeaway={
        peak && total > 0 ? (
          <>
            Los <strong>{WEEKDAYS[peak.weekday].toLowerCase()} de {peak.from} a {peak.to} h</strong> llegan{" "}
            {formatTimes((peak.share * total) / Math.max(1, average))} más mensajes que en una franja promedio. Es el
            mejor momento para publicar y tener a alguien atento.
          </>
        ) : null
      }
    >
      <div className="heatmap">
        <p className="heatmap-readout" aria-live="polite">
          {readout}
        </p>
        <div
          className="heatmap-grid"
          role="img"
          aria-label={`Mensajes recibidos por día de la semana y hora.${peak ? ` El pico es el ${WEEKDAYS[peak.weekday].toLowerCase()} de ${peak.from} a ${peak.to} h.` : ""}`}
          onPointerLeave={() => setHovered(null)}
        >
          <span className="heatmap-corner" aria-hidden="true" />
          {HOURS.map((hour) => (
            <span key={hour} className="heatmap-hour" aria-hidden="true">
              {hour % 6 === 0 ? hour : ""}
            </span>
          ))}
          {WEEKDAYS_SHORT.map((day, weekday) => (
            <div key={day} className="heatmap-row" aria-hidden="true">
              <span className="heatmap-day">{day}</span>
              {HOURS.map((hour) => {
                const index = weekday * 24 + hour;
                const open = hours ? isWithinBusinessHours(hours, weekday, hour) : false;
                return (
                  <span
                    key={hour}
                    className={`heatmap-cell heat-${levels[index]}${open ? " heatmap-open" : ""}${hovered === index ? " heatmap-active" : ""}`}
                    onPointerEnter={() => setHovered(index)}
                    onPointerDown={() => setHovered(index)}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span className="heatmap-scale">
            Menos
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <span key={level} className={`heatmap-swatch heat-${level}`} aria-hidden="true" />
            ))}
            Más
          </span>
          {hours ? (
            <span className="heatmap-hours">
              <span className="heatmap-swatch heatmap-open-swatch" aria-hidden="true" />
              Horario de atención ({businessHoursLabel(hours).toLowerCase()})
            </span>
          ) : null}
        </div>
      </div>
      <DataTable
        caption="Mensajes por día y franja horaria"
        columns={["Día", ...BLOCKS.map((block) => `${block}-${block + 3} h`)]}
        rows={WEEKDAYS.map((day, weekday) => [
          day,
          ...BLOCKS.map((block) =>
            formatNumber(hourly.slice(weekday * 24 + block, weekday * 24 + block + 3).reduce((sum, value) => sum + value, 0)),
          ),
        ])}
      />
    </MetricsSection>
  );
}
