import { useState } from "react";
import { Link } from "react-router-dom";
import type { PlatformType } from "../../api/types";
import { getPlatform } from "../../platforms";
import { formatCompactMoney, formatNumber, formatPercent } from "../../util/format";
import { Meter } from "./charts/Meter";
import { Delta } from "./Delta";
import { percentChange, ratio, type BreakdownRow } from "./metricsModel";
import { MetricsSection } from "./MetricsSection";
import type { MetricsView } from "./useMetricsView";
import "./ChannelTable.css";

type SortKey = "leads" | "qualification" | "fast" | "sales" | "revenue";

type Column = {
  key: SortKey;
  label: string;
  value: (row: BreakdownRow) => number;
};

const COLUMNS: Column[] = [
  { key: "leads", label: "Leads", value: (row) => row.totals.leads },
  { key: "qualification", label: "Calificación", value: (row) => row.rates.qualification ?? 0 },
  { key: "fast", label: "Respuesta en menos de 5 min", value: (row) => row.rates.fastShare ?? 0 },
  { key: "sales", label: "Ventas", value: (row) => row.totals.closed },
  { key: "revenue", label: "Ingresos estimados", value: (row) => row.totals.closed },
];

type ChannelTableProps = {
  view: MetricsView;
};

export function ChannelTable({ view }: ChannelTableProps) {
  const [sort, setSort] = useState<SortKey>("leads");
  const column = COLUMNS.find((item) => item.key === sort) ?? COLUMNS[0];
  const rows = [...view.channels].sort((a, b) => column.value(b) - column.value(a));
  const total = view.totals.leads;
  const ticket = view.settings.averageTicket;
  const columns = ticket === null ? COLUMNS.filter((item) => item.key !== "revenue") : COLUMNS;
  const bestSales = [...view.channels].sort((a, b) => b.totals.closed - a.totals.closed)[0];

  return (
    <MetricsSection
      title="Rendimiento por canal"
      takeaway={
        bestSales && bestSales.totals.closed > 0 ? (
          <>
            <strong>{getPlatform(bestSales.id as PlatformType).name}</strong> generó{" "}
            {formatPercent(ratio(bestSales.totals.closed, view.totals.closed))} de las ventas del
            período.
          </>
        ) : null
      }
    >
      <div className="channel-table-scroll" tabIndex={0} role="region" aria-label="Tabla de rendimiento por canal">
        <table className="channel-table">
          <caption className="visually-hidden">Rendimiento por canal, ordenado por {column.label.toLowerCase()}</caption>
          <thead>
            <tr>
              <th scope="col">Canal</th>
              {columns.map((item) => (
                <th key={item.key} scope="col" aria-sort={sort === item.key ? "descending" : "none"}>
                  <button
                    type="button"
                    className={`channel-sort${sort === item.key ? " channel-sort-active" : ""}`}
                    onClick={() => setSort(item.key)}
                  >
                    {item.label}
                    <span aria-hidden="true">{sort === item.key ? " ↓" : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const platform = getPlatform(row.id as PlatformType);
              return (
                <tr key={row.id} className={platform.colorClass}>
                  <th scope="row">
                    <Link to={`/app/leads?channel=${row.id}`} className="channel-name">
                      <span className="channel-logo">{platform.logo(18)}</span>
                      {platform.name}
                    </Link>
                  </th>
                  <td>
                    <div className="channel-leads">
                      <span className="channel-figure">{formatNumber(row.totals.leads)}</span>
                      <Delta value={percentChange(row.totals.leads, row.previousLeads)} />
                    </div>
                    <Meter value={ratio(row.totals.leads, total)} />
                    <span className="channel-sub">{formatPercent(ratio(row.totals.leads, total))} del total</span>
                  </td>
                  <td>
                    <span className="channel-figure">{formatPercent(row.rates.qualification)}</span>
                  </td>
                  <td>
                    <span className="channel-figure">{formatPercent(row.rates.fastShare)}</span>
                  </td>
                  <td>
                    <span className="channel-figure">{formatNumber(row.totals.closed)}</span>
                    <span className="channel-sub">{formatPercent(row.rates.close, 1)} de los leads</span>
                  </td>
                  {ticket !== null ? (
                    <td>
                      <span className="channel-figure">
                        {formatCompactMoney(row.totals.closed * ticket, view.settings.currency)}
                      </span>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </MetricsSection>
  );
}
