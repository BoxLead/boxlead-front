import { Link } from "react-router-dom";
import { colorClass } from "../../util/categories";
import { formatNumber, formatPercent } from "../../util/format";
import { Meter } from "./charts/Meter";
import { Delta } from "./Delta";
import { percentChange, ratio, UNCATEGORIZED } from "./metricsModel";
import { MetricsSection } from "./MetricsSection";
import type { MetricsView } from "./useMetricsView";
import "./CategoryBreakdown.css";

type CategoryBreakdownProps = {
  view: MetricsView;
};

export function CategoryBreakdown({ view }: CategoryBreakdownProps) {
  const total = view.totals.leads;
  const colors = new Map(view.categories.map((category) => [category.id, colorClass(category.color)]));
  const rows = view.categoryRows;
  const best = [...rows]
    .filter((row) => row.id !== UNCATEGORIZED && row.totals.leads >= 10)
    .sort((a, b) => (b.rates.qualification ?? 0) - (a.rates.qualification ?? 0))[0];

  return (
    <MetricsSection
      title="Leads por categoría"
      takeaway={
        best ? (
          <>
            <strong>{view.categoryName(best.id)}</strong> es la categoría que más califica, con{" "}
            {formatPercent(best.rates.qualification)}.
          </>
        ) : null
      }
      actions={
        <Link to="/app/categories" className="btn btn-secondary btn-sm">
          Editar categorías
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="category-breakdown-empty">Todavía no hay leads con categoría en este período.</p>
      ) : (
        <ul className="category-breakdown">
          {rows.map((row) => (
            <li key={row.id} className={`category-breakdown-row ${colors.get(row.id) ?? "category-color-gray"}`}>
              <div className="category-breakdown-head">
                <Link to={`/app/leads?category=${row.id}&buyers=1`} className="category-breakdown-name">
                  <span className="category-breakdown-dot" aria-hidden="true" />
                  {view.categoryName(row.id)}
                </Link>
                <span className="category-breakdown-count">
                  {formatNumber(row.totals.leads)}
                  <Delta value={percentChange(row.totals.leads, row.previousLeads)} />
                </span>
              </div>
              <Meter value={ratio(row.totals.leads, total)} size="md" />
              <div className="category-breakdown-foot">
                <span>{formatPercent(ratio(row.totals.leads, total))} de los leads</span>
                <span>Califica {formatPercent(row.rates.qualification)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MetricsSection>
  );
}
