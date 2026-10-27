import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { DateText } from "../../components/DateText";
import type { Column } from "../../components/list/DataTable";
import { FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { enumOf, type FilterRules } from "../../components/list/filterRules";
import { useListQuery } from "../../components/list/useListQuery";
import { Money } from "../../components/Money";
import { ResellerDirectoryNotice } from "../../components/ResellerDirectoryNotice";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../format";
import { navItem } from "../../nav";
import { useResellerDirectory } from "../../session/resellerDirectory";
import { CreatePayoutDialog } from "./dialogs";
import { optionsOf, PAYOUT_STATUS } from "./labels";
import type { Payout } from "./types";

const KEYS = ["resellerId", "status"] as const;
const STATUS_OPTIONS = optionsOf(PAYOUT_STATUS);
const RULES: FilterRules = { resellerId: { kind: "uuid", what: "del revendedor" }, status: enumOf(STATUS_OPTIONS) };

export function PayoutsScreen() {
  const item = navItem("payouts");
  const { params, query } = useListQuery<Payout>("/admin/payouts", KEYS, RULES);
  const directory = useResellerDirectory();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const columns: Column<Payout>[] = [
    {
      key: "period",
      header: "Cierre",
      type: "date",
      cell: (row) => (
        <Link className="entity-link" to={`/liquidaciones/${row.id}`}>
          {formatDate(row.periodEnd)}
        </Link>
      ),
    },
    {
      key: "reseller",
      header: "Revendedor",
      width: "md",
      cell: (row) => (
        <Link className="entity-link" to={`/revendedores/${row.resellerId}`}>
          {directory.nameOf(row.resellerId)}
        </Link>
      ),
    },
    { key: "total", header: "Total", type: "money", cell: (row) => <Money money={row.total} code /> },
    { key: "status", header: "Estado", type: "status", cell: (row) => <StatusBadge status={PAYOUT_STATUS[row.status]} /> },
    { key: "createdAt", header: "Armada", type: "date", cell: (row) => <DateText value={row.createdAt} time /> },
    { key: "paidAt", header: "Pagada", type: "date", cell: (row) => <DateText value={row.paidAt} time /> },
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
          <>
            <ResellerDirectoryNotice directory={directory} />
            <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Revendedor"
              value={params.value("resellerId")}
              options={directory.resellers.map((reseller) => ({ value: reseller.id, label: reseller.displayName }))}
              onChange={(value) => params.setFilter("resellerId", value)}
            />
            <SelectFilter label="Estado" value={params.value("status")} options={STATUS_OPTIONS} onChange={(value) => params.setFilter("status", value)} />
            </FilterBar>
          </>
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
