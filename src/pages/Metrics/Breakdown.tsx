import { useState, type ReactNode } from "react";
import type { PlatformType } from "../../api/types";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { getPlatform } from "../../platforms";
import { colorClass } from "../../util/categories";
import { cx } from "../../util/classNames";
import { formatDuration, formatNumber, formatPercent } from "../../util/format";
import type { BreakdownRow } from "./breakdown";
import { Change } from "./Change";
import { Meter } from "./charts/Meter";
import { answeredBuckets, estimateMedianSeconds, percentChange, ratio, type MetricsFilters } from "./metricsModel";
import type { MetricsView } from "./metricsView";
import { MetricsCard } from "./MetricsCard";
import type { MetricKey } from "./series";
import "./Breakdown.css";

type Dimension = "channel" | "category";
type Column = "leads" | "qualification" | "response";

type BreakdownProps = {
  view: MetricsView;
  metric: MetricKey;
  filters: MetricsFilters;
  onFiltersChange: (patch: Partial<MetricsFilters>) => void;
};

const FOCUS: Record<MetricKey, Column> = {
  leads: "leads",
  fast: "response",
  response: "response",
  qualification: "qualification",
};

export function Breakdown({ view, metric, filters, onFiltersChange }: BreakdownProps) {
  const [dimension, setDimension] = useState<Dimension>("channel");
  const byChannel = dimension === "channel";
  const rows = byChannel ? view.channels : view.categoryRows;
  const selected = byChannel ? filters.platform : filters.category;
  const total = rows.reduce((sum, row) => sum + row.totals.leads, 0);
  const colors = new Map(view.categories.map((category) => [category.id, colorClass(category.color)]));
  const focus = (column: Column) => (FOCUS[metric] === column ? "breakdown-focus" : undefined);

  function name(row: BreakdownRow): ReactNode {
    if (byChannel) {
      const platform = getPlatform(row.id as PlatformType);
      return (
        <>
          <span className="breakdown-mark">{platform.logo(16)}</span>
          {platform.name}
        </>
      );
    }
    return (
      <>
        <span className={cx("breakdown-mark", "breakdown-dot", colors.get(row.id) ?? "category-color-gray")} aria-hidden="true" />
        {view.categoryName(row.id)}
      </>
    );
  }

  function toggle(id: string) {
    if (byChannel) onFiltersChange({ platform: selected === id ? "ALL" : (id as PlatformType) });
    else onFiltersChange({ category: selected === id ? null : id });
  }

  return (
    <MetricsCard
      title="Desglose"
      meta={
        <ChoiceGroup<Dimension>
          label="Agrupar por"
          variant="segmented"
          value={dimension}
          onChange={setDimension}
          choices={[
            { value: "channel", label: "Canal" },
            { value: "category", label: "Categoría" },
          ]}
        />
      }
    >
      <table className="breakdown-table">
        <caption className="visually-hidden">
          Leads, calificación y primera respuesta por {byChannel ? "canal" : "categoría"}. Elegí una fila para filtrar.
        </caption>
        <thead>
          <tr>
            <th scope="col">{byChannel ? "Canal" : "Categoría"}</th>
            <th scope="col" className={focus("leads")}>
              Leads
            </th>
            <th scope="col" className="breakdown-optional">
              Variación
            </th>
            <th scope="col" className={focus("qualification")}>
              Calificación
            </th>
            <th scope="col" className={cx("breakdown-optional", focus("response"))}>
              Respuesta
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = selected === row.id;
            const share = ratio(row.totals.leads, total);
            return (
              <tr key={row.id} className={cx(active && "breakdown-active", selected && selected !== "ALL" && !active && "breakdown-dim")}>
                <th scope="row">
                  <div className="breakdown-cell">
                    <button type="button" className="breakdown-name" aria-pressed={active} onClick={() => toggle(row.id)}>
                      {name(row)}
                    </button>
                    <Meter value={share} />
                  </div>
                </th>
                <td className={focus("leads")}>
                  <AnimatedNumber className="breakdown-value" value={row.totals.leads} format={formatNumber} />
                  <span className="breakdown-sub">{formatPercent(share)}</span>
                </td>
                <td className="breakdown-optional">
                  <Change value={percentChange(row.totals.leads, row.previousLeads)} kind="percent" />
                </td>
                <td className={focus("qualification")}>
                  <span className="breakdown-value">{formatPercent(row.qualification)}</span>
                </td>
                <td className={cx("breakdown-optional", focus("response"))}>
                  <span className="breakdown-value">
                    {formatDuration(estimateMedianSeconds(answeredBuckets(row.totals.firstResponse)))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </MetricsCard>
  );
}
