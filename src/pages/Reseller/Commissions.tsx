import type { CommissionEntry, CommissionTotal } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ChartIcon } from "../../components/icons/UiIcons";
import { Tag } from "../../components/ui/Tag";
import { sortEntries, sortTotals } from "../../data/referrals";
import { formatDate } from "../../util/format";
import { commissionLabel, formatAmount } from "./resellerModel";

type CommissionsProps = {
  totals: CommissionTotal[];
  entries: CommissionEntry[];
};

export function Commissions({ totals, entries }: CommissionsProps) {
  const sortedTotals = sortTotals(totals);
  const sortedEntries = sortEntries(entries);

  return (
    <section className="reseller-section" aria-labelledby="reseller-commissions-title">
      <div className="reseller-section-head">
        <h2 id="reseller-commissions-title" className="reseller-section-title">Comisiones</h2>
        <p className="reseller-hint">Las liquidaciones y los datos de cobro los maneja BoxLead.</p>
      </div>

      {sortedTotals.length > 0 ? (
        <dl className="reseller-totals" aria-label="Totales por estado">
          {sortedTotals.map((total) => {
            const label = commissionLabel(total.status);
            return (
              <div key={`${total.status}-${total.amount.currency}`} className="panel reseller-total">
                <dt>
                  <Tag tone={label.tone}>{label.label}</Tag>
                </dt>
                <dd className="reseller-total-amount">{formatAmount(total.amount)}</dd>
                {label.hint ? <dd className="reseller-total-hint">{label.hint}</dd> : null}
              </div>
            );
          })}
        </dl>
      ) : null}

      {sortedEntries.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<ChartIcon />}
            title="Todavía no hay comisiones"
            hint="Vas a ver una por cada cobro aprobado de tus clientes."
          />
        </div>
      ) : (
        <div className="panel reseller-table-wrap">
          <table className="reseller-table">
            <caption className="visually-hidden">Comisiones por cobro</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col">Cobro</th>
                <th scope="col" className="reseller-table-amount">Monto</th>
                <th scope="col">Estado</th>
                <th scope="col">Liberación</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => {
                const label = commissionLabel(entry.status);
                return (
                  <tr key={`${entry.date}-${entry.customerLabel}-${entry.cycle}-${index}`}>
                    <td className="reseller-cell-date" data-label="Fecha">{formatDate(entry.date)}</td>
                    <td className="reseller-cell-customer">{entry.customerLabel}</td>
                    <td className="reseller-cell-cycle" data-label="Cobro">{entry.cycle}</td>
                    <td className="reseller-cell-amount reseller-table-amount">{formatAmount(entry.amount)}</td>
                    <td className="reseller-cell-status">
                      <Tag tone={label.tone}>{label.label}</Tag>
                    </td>
                    <td className="reseller-cell-release" data-label="Liberación">{formatDate(entry.releaseAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
