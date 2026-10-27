import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import type { Column } from "../../components/list/DataTable";
import { FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { Screen } from "../../components/Screen";
import { formatDate, formatDateTime, formatMoney } from "../../format";
import { navItem } from "../../nav";
import { CreatePayoutDialog } from "./dialogs";
import { useResellerDirectory } from "./hooks";
import { optionsOf, PAYOUT_STATUS } from "./labels";
import { StatusTag } from "./parts";
import type { Payout } from "./types";

const KEYS = ["resellerId", "status"] as const;
const STATUS_OPTIONS = optionsOf(PAYOUT_STATUS);

export function PayoutsScreen() {
  const item = navItem("payouts");
  const { params, query } = useListQuery<Payout>("/admin/payouts", KEYS);
  const directory = useResellerDirectory();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const columns: Column<Payout>[] = [
    {
      key: "period",
      header: "Cierre",
      cell: (row) => (
        <Link className="ref-link" to={`/liquidaciones/${row.id}`}>
          {formatDate(row.periodEnd)}
        </Link>
      ),
    },
    {
      key: "reseller",
      header: "Revendedor",
      cell: (row) => (
        <Link className="ref-link" to={`/revendedores/${row.resellerId}`}>
          {directory.nameOf(row.resellerId)}
        </Link>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "end",
      cell: (row) => (
        <span className="num">
          {formatMoney(row.total)} <span className="ref-muted">{row.total.currency}</span>
        </span>
      ),
    },
    { key: "status", header: "Estado", cell: (row) => <StatusTag value={PAYOUT_STATUS[row.status]} /> },
    { key: "paidAt", header: "Pagada", cell: (row) => formatDateTime(row.paidAt) },
    { key: "createdAt", header: "Armada", cell: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <Screen
      title={item.label}
      description={item.description}
      actions={
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          Armar liquidación
        </button>
      }
    >
      <ListView
        caption="Liquidaciones"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay liquidaciones"
        emptyHint="Armá una cuando un revendedor tenga comisiones aprobadas."
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Revendedor"
              value={params.value("resellerId")}
              options={directory.resellers.map((reseller) => ({ value: reseller.id, label: reseller.displayName }))}
              onChange={(value) => params.setFilter("resellerId", value)}
            />
            <SelectFilter label="Estado" value={params.value("status")} options={STATUS_OPTIONS} onChange={(value) => params.setFilter("status", value)} />
          </FilterBar>
        }
      />
      {creating ? (
        <CreatePayoutDialog
          resellers={directory.resellers}
          onClose={() => setCreating(false)}
          onCreated={(payout) => {
            setCreating(false);
            toast({ tone: "success", message: "La liquidación quedó armada." });
            navigate(`/liquidaciones/${payout.id}`);
          }}
        />
      ) : null}
    </Screen>
  );
}
