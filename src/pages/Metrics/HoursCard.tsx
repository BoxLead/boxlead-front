import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "../../util/classNames";
import { formatNumber } from "../../util/format";
import { isWithinBusinessHours, WEEKDAYS, weekdayInSentence, weekdayName, weekdayShort } from "../../util/metrics";
import { heatLevels, peakWindow } from "./hours";
import { MetricsCard } from "./MetricsCard";
import type { MetricsView } from "./metricsView";
import "./HoursCard.css";

type HoursCardProps = {
  view: MetricsView;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function HoursCard({ view }: HoursCardProps) {
  const { t } = useTranslation("metrics");
  const hourly = view.totals.inboundByHour;
  const levels = heatLevels(hourly, 5);
  const peak = peakWindow(hourly);
  const total = hourly.reduce((sum, value) => sum + value, 0);
  const hours = view.settings.businessHours;
  const [hovered, setHovered] = useState<number | null>(null);

  const readout =
    hovered !== null
      ? t("hours.hovered", {
          day: weekdayName(Math.floor(hovered / 24)),
          hour: hovered % 24,
          value: formatNumber(hourly[hovered]),
        })
      : peak
        ? t("hours.peak", { day: weekdayInSentence(peak.weekday), from: peak.from, to: peak.to })
        : "";

  return (
    <MetricsCard
      title={t("hours.title")}
      meta={
        <span className="hours-readout" aria-hidden="true">
          {readout}
        </span>
      }
    >
      <div
        className="hours-grid"
        role="img"
        aria-label={
          peak && total > 0
            ? t("hours.gridLabelPeak", { day: weekdayInSentence(peak.weekday), from: peak.from, to: peak.to })
            : t("hours.gridLabel")
        }
        onPointerLeave={() => setHovered(null)}
      >
        {WEEKDAYS.map((day, weekday) => (
          <div key={day} className="hours-row" aria-hidden="true">
            <span className="hours-day">{weekdayShort(weekday)}</span>
            {HOURS.map((hour) => {
              const index = weekday * 24 + hour;
              const open = hours ? isWithinBusinessHours(hours, weekday, hour) : false;
              return (
                <span
                  key={hour}
                  className={cx("hours-cell", `hours-${levels[index]}`, open && "hours-open", hovered === index && "hours-active")}
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
          {t("hours.less")}
          {[1, 2, 3, 4, 5].map((level) => (
            <span key={level} className={`hours-swatch hours-${level}`} />
          ))}
          {t("hours.more")}
        </span>
        {hours ? (
          <span className="hours-scale">
            <span className="hours-swatch hours-open" />
            {t("hours.businessHours")}
          </span>
        ) : null}
      </div>
    </MetricsCard>
  );
}
