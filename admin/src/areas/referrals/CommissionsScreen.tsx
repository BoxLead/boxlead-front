import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { Screen } from "../../components/Screen";
import { formatDate, formatMoney } from "../../format";
import { navItem } from "../../nav";
import { canHold, canRelease, canReverse, isReleasable, totalsByCurrency, type CommissionAction } from "./api";
import { ApproveDialog, CommissionDialog } from "./dialogs";
import { useResellerDirectory } from "./hooks";
import { COMMISSION_KIND, COMMISSION_STATUS, optionsOf, shortId } from "./labels";
import { StatusTag } from "./parts";
import type { Commission } from "./types";

const KEYS = ["status", "resellerId", "from", "to"] as const;
const STATUS_OPTIONS = optionsOf(COMMISSION_STATUS);

type Dialog = { kind: "approve"; commissions: Commission[] } | { kind: CommissionAction; commission: Commission };

type Selection = { search: string; rows: Map<string, Commission> };

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
            className="ref-check"
            checked={selected.has(row.id)}
            aria-label={`Elegir la comisión de ${formatMoney(row.amount)} del ${formatDate(row.createdAt)}`}
            onChange={() => toggle(row)}
          />
        ) : (
          <span className="ref-muted">—</span>
        ),
    },
    { key: "createdAt", header: "Alta", cell: (row) => <span className="ref-nowrap">{formatDate(row.createdAt)}</span> },
    {
      key: "who",
      header: "Revendedor y cliente",
      cell: (row) => (
        <span className="ref-cell-stack">
          <Link className="ref-link" to={`/revendedores/${row.resellerId}`}>
            {directory.nameOf(row.resellerId)}
          </Link>
          <Link className="ref-link ref-sub" to={`/usuarios/${row.customerUserId}`}>
            Cliente {shortId(row.customerUserId)}
          </Link>
        </span>
      ),
    },
    {
      key: "amount",
      header: "Monto",
      align: "end",
      cell: (row) => (
        <span className="ref-cell-stack">
          <span className="num ref-nowrap">{formatMoney(row.amount)}</span>
          <span className="ref-sub">
            {COMMISSION_KIND[row.kind]}, ciclo {row.cycleNumber}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <span className="ref-cell-stack">
          <StatusTag value={COMMISSION_STATUS[row.status]} />
          {row.payoutId ? (
            <Link className="ref-link ref-sub" to={`/liquidaciones/${row.payoutId}`}>
              Ver liquidación
            </Link>
          ) : null}
        </span>
      ),
    },
    {
      key: "releaseAt",
      header: "Liberación",
      cell: (row) => (
        <span className="ref-cell-stack">
          <span className="ref-nowrap">{formatDate(row.releaseAt)}</span>
          {isReleasable(row) ? <span className="ref-hint">Ya se puede aprobar</span> : null}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (row) => {
        const actions: { action: CommissionAction; label: string }[] = [];
        if (canHold(row)) actions.push({ action: "hold", label: "Retener" });
        if (canRelease(row)) actions.push({ action: "release", label: "Liberar" });
        if (canReverse(row)) actions.push({ action: "reverse", label: "Revertir" });
        if (actions.length === 0) return <span className="ref-muted">—</span>;
        return (
          <span className="ref-row-actions">
            {actions.map(({ action, label }) => (
              <button
                key={action}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDialog({ kind: action, commission: row })}
              >
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
            <div className="ref-toolbar" role="group" aria-label="Aprobación">
              <p className="ref-muted">
                {selected.size === 0
                  ? "Elegí las comisiones devengadas que ya llegaron a su fecha de liberación para aprobarlas."
                  : `${selected.size} elegidas por ${selectedTotals.map((total) => `${formatMoney(total)} ${total.currency}`).join(" y ")}.`}
              </p>
              <div className="ref-toolbar-actions">
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

const DONE: Record<CommissionAction, string> = {
  hold: "La comisión quedó retenida.",
  release: "La comisión volvió a devengada.",
  reverse: "Agregamos la reversa de la comisión.",
};
