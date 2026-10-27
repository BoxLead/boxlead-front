import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { formatDateTime } from "../../format";
import { navItem } from "../../nav";
import { Amount, CustomerCell, NoAction, ShortId, Stack, StatusTag } from "./cells";
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
    {
      key: "payment",
      header: "Pago",
      cell: (row) => (
        <Stack
          main={<ShortId id={row.paymentId} />}
          detail={
            <Link className="billing-link" to={`/pagos?userId=${encodeURIComponent(row.userId)}`}>
              Ver pagos del cliente
            </Link>
          }
        />
      ),
    },
    { key: "customer", header: "Cliente", cell: (row) => <CustomerCell userId={row.userId} /> },
    {
      key: "amount",
      header: "Monto",
      align: "end",
      cell: (row) => (row.amount ? <Amount money={row.amount} /> : "Lo que quedaba del pago"),
    },
    { key: "status", header: "Estado", cell: (row) => <StatusTag status={REFUND_STATUS[row.status]} /> },
    {
      key: "provider",
      header: "Id en Mercado Pago",
      cell: (row) => (row.providerRefundId ? <span className="num">{row.providerRefundId}</span> : <span className="billing-detail">Sin id</span>),
    },
    {
      key: "requested",
      header: "Pedido",
      cell: (row) => (
        <Stack
          main={formatDateTime(row.createdAt)}
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
      cell: (row) =>
        row.status === "REQUESTED" ? (
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
        ) : (
          <NoAction />
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
