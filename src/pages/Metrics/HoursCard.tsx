import { useState } from "react";
import { formatNumber } from "../../util/format";
import { isWithinBusinessHours, WEEKDAYS, WEEKDAYS_SHORT } from "../../util/metrics";
import { heatLevels, peakWindow } from "./metricsModel";
import { MetricsCard } from "./MetricsCard";
import type { MetricsView } from "./useMetricsView";
import "./HoursCard.css";

type HoursCardProps = {
  view: MetricsView;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function HoursCard({ view }: HoursCardProps) {
  const hourly = view.totals.inboundByHour;
  const levels = heatLevels(hourly, 5);
  const peak = peakWindow(hourly);
  const total = hourly.reduce((sum, value) => sum + value, 0);
  const hours = view.settings.businessHours;
  const [hovered, setHovered] = useState<number | null>(null);

  const readout =
    hovered !== null
      ? `${WEEKDAYS[Math.floor(hovered / 24)]} ${hovered % 24} h · ${formatNumber(hourly[hovered])} mensajes`
      : peak
        ? `Pico ${WEEKDAYS[peak.weekday].toLowerCase()} de ${peak.from} a ${peak.to} h`
        : "";

  return (
    <MetricsCard
      title="Cuándo te escriben"
      meta={
        <span className="hours-readout" aria-live="polite">
          {readout}
        </span>
      }
    >
      <div
        className="hours-grid"
        role="img"
        aria-label={`Mensajes por día y hora.${peak && total > 0 ? ` Pico el ${WEEKDAYS[peak.weekday].toLowerCase()} de ${peak.from} a ${peak.to} h.` : ""}`}
        onPointerLeave={() => setHovered(null)}
      >
        {WEEKDAYS_SHORT.map((day, weekday) => (
          <div key={day} className="hours-row" aria-hidden="true">
            <span className="hours-day">{day}</span>
            {HOURS.map((hour) => {
              const index = weekday * 24 + hour;
              const open = hours ? isWithinBusinessHours(hours, weekday, hour) : false;
              return (
                <span
                  key={hour}
                  className={`hours-cell hours-${levels[index]}${open ? " hours-open" : ""}${hovered === index ? " hours-active" : ""}`}
                  onPointerEnter={() => setHovered(index)}
                  onPointerDown={() => setHovered(index)}
                />
              );
            })}
          </div>
        ))}
        <div className="hours-row hours-axis" aria-hidden="true">
          <span />
          {HOURS.map((hour) => (
            <span key={hour}>{hour % 6 === 0 ? hour : ""}</span>
          ))}
        </div>
      </div>
      <div className="hours-legend" aria-hidden="true">
        <span className="hours-scale">
          Menos
          {[1, 2, 3, 4, 5].map((level) => (
            <span key={level} className={`hours-swatch hours-${level}`} />
          ))}
          Más
        </span>
        {hours ? (
          <span className="hours-scale">
            <span className="hours-swatch hours-open" />
            Horario de atención
          </span>
        ) : null}
      </div>
    </MetricsCard>
  );
}
