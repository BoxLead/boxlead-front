import { useState } from "react";
import type { PlatformType } from "../../api/types";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { getPlatform } from "../../platforms";
import { colorClass } from "../../util/categories";
import { formatNumber, formatPercent } from "../../util/format";
import { Change } from "./Change";
import { Meter } from "./charts/Meter";
import { percentChange, ratio, type BreakdownRow, type MetricsFilters } from "./metricsModel";
import { MetricsCard } from "./MetricsCard";
import type { MetricKey } from "./series";
import type { MetricsView } from "./useMetricsView";
import "./Breakdown.css";

type Dimension = "channel" | "category";

type BreakdownProps = {
  view: MetricsView;
  metric: MetricKey;
  filters: MetricsFilters;
  onFiltersChange: (patch: Partial<MetricsFilters>) => void;
};

const COLUMN: Record<MetricKey, "leads" | "qualification" | "sales" | null> = {
  leads: "leads",
  fast: null,
  qualification: "qualification",
  sales: "sales",
  revenue: "sales",
};

export function Breakdown({ view, metric, filters, onFiltersChange }: BreakdownProps) {
  const focus = COLUMN[metric];
  const mark = (column: "leads" | "qualification" | "sales") => (focus === column ? "breakdown-focus" : undefined);
  const [dimension, setDimension] = useState<Dimension>("channel");
  const rows = dimension === "channel" ? view.channels : view.categoryRows;
  const total = rows.reduce((sum, row) => sum + row.totals.leads, 0);
  const colors = new Map(view.categories.map((category) => [category.id, colorClass(category.color)]));
  const selected = dimension === "channel" ? filters.platform : filters.category;

  function label(row: BreakdownRow) {
    if (dimension === "channel") {
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
        <span className={`breakdown-mark breakdown-dot ${colors.get(row.id) ?? "category-color-gray"}`} aria-hidden="true" />
        {view.categoryName(row.id)}
      </>
    );
  }

  function toggle(id: string) {
    if (dimension === "channel") onFiltersChange({ platform: selected === id ? "ALL" : (id as PlatformType) });
    else onFiltersChange({ category: selected === id ? null : id });
  }

  return (
    <MetricsCard
      title="Desglose"
      className="breakdown"
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
          Leads, calificación y ventas por {dimension === "channel" ? "canal" : "categoría"}. Elegí una fila para filtrar.
        </caption>
        <thead>
          <tr>
            <th scope="col">{dimension === "channel" ? "Canal" : "Categoría"}</th>
            <th scope="col" className={mark("leads")}>
              Leads
            </th>
            <th scope="col" className={mark("qualification")}>
              Calificación
            </th>
            <th scope="col" className={`breakdown-optional ${mark("sales") ?? ""}`}>
              Ventas
            </th>
            <th scope="col" className="breakdown-optional">
              Variación
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = selected === row.id;
            const share = ratio(row.totals.leads, total);
            return (
              <tr key={row.id} className={active ? "breakdown-active" : selected && selected !== "ALL" ? "breakdown-dim" : undefined}>
                <th scope="row">
                  <div className="breakdown-cell">
                    <button type="button" className="breakdown-name" aria-pressed={active} onClick={() => toggle(row.id)}>
                      {label(row)}
                    </button>
                    <Meter value={share} />
                  </div>
                </th>
                <td className={mark("leads")}>
                  <AnimatedNumber className="breakdown-value" value={row.totals.leads} format={formatNumber} />
                  <span className="breakdown-sub">{formatPercent(share)}</span>
                </td>
                <td className={mark("qualification")}>
                  <span className="breakdown-value">{formatPercent(row.rates.qualification)}</span>
                </td>
                <td className={`breakdown-optional ${mark("sales") ?? ""}`}>
                  <span className="breakdown-value">{formatNumber(row.totals.closed)}</span>
                </td>
                <td className="breakdown-optional">
                  <Change value={percentChange(row.totals.leads, row.previousLeads)} kind="percent" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </MetricsCard>
  );
}
