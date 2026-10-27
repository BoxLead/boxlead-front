import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { DateText } from "../../components/DateText";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { Money } from "../../components/Money";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatMoney } from "../../format";
import { navItem } from "../../nav";
import { canHold, canRelease, canReverse, isReleasable, totalsByCurrency, type CommissionAction } from "./api";
import { ApproveDialog, CommissionDialog } from "./dialogs";
import { useResellerDirectory } from "./hooks";
import { COMMISSION_KIND, COMMISSION_STATUS, optionsOf, shortId } from "./labels";
import type { Commission } from "./types";

const KEYS = ["status", "resellerId", "from", "to"] as const;
const STATUS_OPTIONS = optionsOf(COMMISSION_STATUS);

type Dialog = { kind: "approve"; commissions: Commission[] } | { kind: CommissionAction; commission: Commission };

type Selection = { search: string; rows: Map<string, Commission> };

const DONE: Record<CommissionAction, string> = {
  hold: "La comisión quedó retenida.",
  release: "La comisión volvió a devengada.",
  reverse: "Agregamos la reversa de la comisión.",
};

export function CommissionsScreen() {
  const item = navItem("commissions");
  const { params, query } = useListQuery<Commission>("/admin/commissions", KEYS);
  const directory = useResellerDirectory();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [selection, setSelection] = useState<Selection>({ search: "", rows: new Map() });
  const toast = useToast();
  const selected = selection.search === params.search ? selection.rows : new Map<string, Commission>();
  const releasable = query.status === "ready" ? query.data.items.filter((row) => isReleasable(row)) : [];
  const selectedTotals = totalsByCurrency([...selected.values()].map((row) => row.amount));

  function toggle(row: Commission) {
    const rows = new Map(selected);
    if (rows.has(row.id)) rows.delete(row.id);
    else rows.set(row.id, row);
    setSelection({ search: params.search, rows });
  }

  function selectReleasable() {
    setSelection({ search: params.search, rows: new Map(releasable.map((row) => [row.id, row])) });
  }

  function done(message: string) {
    setDialog(null);
    setSelection({ search: "", rows: new Map() });
    toast({ tone: "success", message });
    query.reload();
  }

  const columns: Column<Commission>[] = [
    {
      key: "select",
      header: "Elegir",
      cell: (row) =>
        isReleasable(row) ? (
          <input
            type="checkbox"
            className="data-table-check"
            checked={selected.has(row.id)}
            aria-label={`Elegir la comisión de ${formatMoney(row.amount)} del ${formatDate(row.createdAt)}`}
            onChange={() => toggle(row)}
          />
        ) : (
          <span className="sub-text">—</span>
        ),
    },
    { key: "createdAt", header: "Alta", type: "date", cell: (row) => <DateText value={row.createdAt} /> },
    {
      key: "who",
      header: "Revendedor y cliente",
      width: "md",
      cell: (row) => (
        <span className="cell-stack">
          <Link className="entity-link" to={`/revendedores/${row.resellerId}`}>
            {directory.nameOf(row.resellerId)}
          </Link>
          <Link className="entity-link sub-text" to={`/usuarios/${row.customerUserId}`}>
            Cliente {shortId(row.customerUserId)}
          </Link>
        </span>
      ),
    },
    {
      key: "amount",
      header: "Monto",
      type: "money",
      cell: (row) => (
        <span className="cell-stack">
          <Money money={row.amount} />
          <span className="sub-text">
            {COMMISSION_KIND[row.kind]}, ciclo {row.cycleNumber}
          </span>
        </span>
      ),
    },
    { key: "status", header: "Estado", type: "status", cell: (row) => <StatusBadge status={COMMISSION_STATUS[row.status]} /> },
    {
      key: "releaseAt",
      header: "Liberación",
      type: "date",
      cell: (row) => (
        <span className="cell-stack">
          <DateText value={row.releaseAt} />
          {isReleasable(row) ? <span className="sub-text ref-hint">Ya se puede aprobar</span> : null}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) => {
        const actions: { action: CommissionAction; label: string }[] = [];
        if (canHold(row)) actions.push({ action: "hold", label: "Retener" });
        if (canRelease(row)) actions.push({ action: "release", label: "Liberar" });
        if (canReverse(row)) actions.push({ action: "reverse", label: "Revertir" });
        if (actions.length === 0 && !row.payoutId) return <span className="sub-text">—</span>;
        return (
          <span className="row-actions">
            {row.payoutId ? (
              <Link className="btn btn-ghost btn-sm" to={`/liquidaciones/${row.payoutId}`}>
                Liquidación
              </Link>
            ) : null}
            {actions.map(({ action, label }) => (
              <button key={action} type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: action, commission: row })}>
                {label}
              </button>
            ))}
          </span>
        );
      },
    },
  ];

  return (
    <Screen title={item.label} description={item.description}>
      <ListView
        caption="Comisiones"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay comisiones"
        emptyHint="Se crean solas cuando un cliente atribuido paga."
        filters={
          <>
            <FilterBar active={params.active} onClear={params.clear}>
              <SelectFilter label="Estado" value={params.value("status")} options={STATUS_OPTIONS} onChange={(value) => params.setFilter("status", value)} />
              <SelectFilter
                label="Revendedor"
                value={params.value("resellerId")}
                options={directory.resellers.map((reseller) => ({ value: reseller.id, label: reseller.displayName }))}
                onChange={(value) => params.setFilter("resellerId", value)}
              />
              <DateFilter label="Desde" value={params.value("from")} onChange={(value) => params.setFilter("from", value)} />
              <DateFilter label="Hasta" value={params.value("to")} onChange={(value) => params.setFilter("to", value)} />
            </FilterBar>
            {releasable.length > 0 || selected.size > 0 ? (
              <div className="selection-bar" role="group" aria-label="Aprobación">
                <p>
                  {selected.size === 0
                    ? "Elegí las comisiones devengadas que ya llegaron a su fecha de liberación para aprobarlas."
                    : `${selected.size} elegidas por ${selectedTotals.map((total) => `${formatMoney(total)} ${total.currency}`).join(" y ")}.`}
                </p>
                <div className="selection-actions">
                  <button type="button" className="btn btn-secondary btn-sm" disabled={releasable.length === 0} onClick={selectReleasable}>
                    Elegir las liberables
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={selected.size === 0}
                    onClick={() => setDialog({ kind: "approve", commissions: [...selected.values()] })}
                  >
                    Aprobar elegidas
                  </button>
                </div>
              </div>
            ) : null}
          </>
        }
      />
      {dialog?.kind === "approve" ? (
        <ApproveDialog
          commissions={dialog.commissions}
          onClose={() => setDialog(null)}
          onDone={() => done(dialog.commissions.length === 1 ? "La comisión quedó aprobada." : `Aprobamos ${dialog.commissions.length} comisiones.`)}
        />
      ) : dialog ? (
        <CommissionDialog
          commission={dialog.commission}
          action={dialog.kind}
          resellerName={directory.nameOf(dialog.commission.resellerId)}
          onClose={() => setDialog(null)}
          onDone={() => done(DONE[dialog.kind])}
        />
      ) : null}
    </Screen>
  );
}
