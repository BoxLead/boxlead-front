import { useState } from "react";
import { useToast } from "../../../../src/components/ui/toast";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { DateText } from "../../components/DateText";
import { navItem } from "../../nav";
import { canAccess } from "../../session/roles";
import { useAdmin } from "../../session/session";
import { Amount, CustomerCell, NoAction, ShortId, Stack, StatusTag } from "./cells";
import { INVOICE_STATUS, PAYMENT_STATUS, PAYMENT_STATUS_OPTIONS } from "./labels";
import { canRefund } from "./money";
import { RefundDialog } from "./RefundDialog";
import type { PaymentRow, RefundResult } from "./types";

const FILTERS = ["status", "userId", "from", "to"] as const;

const REFUND_NOTICE: Record<RefundResult["status"], { tone: "success" | "info" | "danger"; message: string }> = {
  APPROVED: { tone: "success", message: "Mercado Pago aprobó el reembolso." },
  REQUESTED: { tone: "info", message: "Pedimos el reembolso y Mercado Pago todavía no respondió. Podés reintentarlo desde Reembolsos." },
  REJECTED: { tone: "danger", message: "Mercado Pago rechazó el reembolso." },
};

function RefundedDetail({ row }: { row: PaymentRow }) {
  if (row.refunded.amountMinor <= 0) return null;
  return (
    <>
      Reembolsado <Amount money={row.refunded} />
    </>
  );
}

export function PaymentsScreen() {
  const me = useAdmin();
  const toast = useToast();
  const item = navItem("payments");
  const { params, query } = useListQuery<PaymentRow>("/admin/payments", FILTERS);
  const [target, setTarget] = useState<PaymentRow | null>(null);
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const canRefundPayments = canAccess(me.roles, ["FINANCE"]);

  function done(result: RefundResult) {
    toast(REFUND_NOTICE[result.status]);
    setOpen(false);
    query.reload();
  }

  const columns: Column<PaymentRow>[] = [
    {
      key: "customer",
      header: "Cliente",
      width: "md",
      cell: (row) => <Stack main={<CustomerCell userId={row.userId} email={row.email} />} detail={<ShortId id={row.id} />} />,
    },
    {
      key: "amount",
      header: "Monto",
      type: "money",
      cell: (row) => <Stack main={<Amount money={row.amount} code />} detail={<RefundedDetail row={row} />} />,
    },
    {
      key: "status",
      header: "Estado",
      type: "status",
      cell: (row) => <StatusTag status={PAYMENT_STATUS[row.status]} detail={row.statusDetail} />,
    },
    {
      key: "date",
      header: "Fecha",
      type: "date",
      cell: (row) => <Stack main={<DateText value={row.approvedAt ?? row.createdAt} time />} detail={row.approvedAt ? "Aprobado" : "Creado"} />,
    },
    {
      key: "invoice",
      header: "Factura",
      type: "status",
      cell: (row) =>
        row.invoice ? (
          <Stack main={<StatusTag status={INVOICE_STATUS[row.invoice.status]} />} detail={row.invoice.invoiceNumber ?? undefined} />
        ) : (
          <span className="sub-text">Sin factura</span>
        ),
    },
  ];

  if (canRefundPayments) {
    columns.push({
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) =>
        canRefund(row) ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label={`Reembolsar el pago ${row.id.slice(0, 8)} de ${row.email ?? row.userId}`}
            onClick={() => {
              setTarget(row);
              setAttempt((value) => value + 1);
              setOpen(true);
            }}
          >
            Reembolsar
          </button>
        ) : (
          <NoAction />
        ),
    });
  }

  return (
    <Screen title={item.label} description={item.description}>
      <ListView
        caption="Pagos"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay pagos"
        emptyHint="Aparecen cuando Mercado Pago avisa el primer cobro."
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Estado"
              value={params.value("status")}
              options={PAYMENT_STATUS_OPTIONS}
              onChange={(value) => params.setFilter("status", value)}
            />
            <SearchFilter
              label="Id de usuario"
              value={params.value("userId")}
              placeholder="El id completo del cliente"
              onSubmit={(value) => params.setFilter("userId", value)}
            />
            <DateFilter label="Desde" value={params.value("from")} onChange={(value) => params.setFilter("from", value)} />
            <DateFilter label="Hasta" value={params.value("to")} onChange={(value) => params.setFilter("to", value)} />
          </FilterBar>
        }
      />
      {target ? (
        <RefundDialog key={attempt} payment={target} open={open} onClose={() => setOpen(false)} onDone={done} />
      ) : null}
    </Screen>
  );
}
