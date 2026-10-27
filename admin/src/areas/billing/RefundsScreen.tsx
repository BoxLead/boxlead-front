import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { DateText } from "../../components/DateText";
import { navItem } from "../../nav";
import { Amount, CustomerCell, RowActions, ShortId, Stack, StatusTag } from "./cells";
import { REFUND_STATUS, REFUND_STATUS_OPTIONS } from "./labels";
import { RetryRefundDialog } from "./RetryRefundDialog";
import type { RefundResult, RefundRow } from "./types";

const FILTERS = ["status"] as const;

const RETRY_NOTICE: Record<RefundResult["status"], { tone: "success" | "info" | "danger"; message: string }> = {
  APPROVED: { tone: "success", message: "Mercado Pago aprobó el reembolso." },
  REQUESTED: { tone: "info", message: "Lo mandamos de nuevo y Mercado Pago todavía no respondió." },
  REJECTED: { tone: "danger", message: "Mercado Pago rechazó el reembolso." },
};

export function RefundsScreen() {
  const toast = useToast();
  const item = navItem("refunds");
  const { params, query } = useListQuery<RefundRow>("/admin/refunds", FILTERS);
  const [target, setTarget] = useState<RefundRow | null>(null);
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function done(result: RefundResult) {
    toast(RETRY_NOTICE[result.status]);
    setOpen(false);
    query.reload();
  }

  const columns: Column<RefundRow>[] = [
    { key: "payment", header: "Pago", type: "id", cell: (row) => <ShortId id={row.paymentId} /> },
    { key: "customer", header: "Cliente", type: "id", cell: (row) => <CustomerCell userId={row.userId} /> },
    {
      key: "amount",
      header: "Monto",
      type: "money",
      cell: (row) => (row.amount ? <Amount money={row.amount} code /> : <span className="sub-text">Lo que quedaba del pago</span>),
    },
    { key: "status", header: "Estado", type: "status", cell: (row) => <StatusTag status={REFUND_STATUS[row.status]} /> },
    {
      key: "provider",
      header: "Id en Mercado Pago",
      type: "id",
      cell: (row) => (row.providerRefundId ? row.providerRefundId : <span className="sub-text">Sin id</span>),
    },
    {
      key: "requested",
      header: "Pedido",
      type: "date",
      cell: (row) => (
        <Stack
          main={<DateText value={row.createdAt} time />}
          detail={row.requestedBy ? (
            <>
              Por <ShortId id={row.requestedBy} />
            </>
          ) : (
            "Por el sistema"
          )}
        />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) => (
        <RowActions>
          <Link className="btn btn-ghost btn-sm" to={`/pagos?userId=${encodeURIComponent(row.userId)}`}>
            Pagos
          </Link>
          {row.status === "REQUESTED" ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label={`Reintentar el reembolso ${row.id.slice(0, 8)}`}
              onClick={() => {
                setTarget(row);
                setAttempt((value) => value + 1);
                setOpen(true);
              }}
            >
              Reintentar
            </button>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <Screen title={item.label} description={item.description}>
      <ListView
        caption="Reembolsos"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay reembolsos"
        emptyHint="Se piden desde Pagos y acá ves la respuesta de Mercado Pago."
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Estado"
              value={params.value("status")}
              options={REFUND_STATUS_OPTIONS}
              onChange={(value) => params.setFilter("status", value)}
            />
          </FilterBar>
        }
      />
      {target ? <RetryRefundDialog key={attempt} refund={target} open={open} onClose={() => setOpen(false)} onDone={done} /> : null}
    </Screen>
  );
}
