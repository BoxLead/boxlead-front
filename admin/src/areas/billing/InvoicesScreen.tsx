import { useState } from "react";
import { useToast } from "../../../../src/components/ui/toast";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { dateRange, enumOf, type FilterRules } from "../../components/list/filterRules";
import { useListQuery } from "../../components/list/useListQuery";
import { DateText } from "../../components/DateText";
import { formatDate } from "../../format";
import { navItem } from "../../nav";
import { Amount, CustomerCell, NoAction, RowActions, Stack, StatusTag } from "./cells";
import { InvoiceDialog, type InvoiceAction } from "./InvoiceDialog";
import { INVOICE_STATUS, INVOICE_STATUS_OPTIONS } from "./labels";
import { ReceiverCell } from "./Receiver";
import type { InvoiceRow } from "./types";

const FILTERS = ["status", "from", "to"] as const;
const RULES: FilterRules = { status: enumOf(INVOICE_STATUS_OPTIONS), ...dateRange("from", "to") };

const DONE: Record<InvoiceAction, string> = {
  issue: "Marcamos la factura como emitida.",
  void: "Anulamos la factura.",
};

type Pending = { invoice: InvoiceRow; action: InvoiceAction };

function todayInBuenosAires(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

function statusDate(row: InvoiceRow): string | undefined {
  if (row.status === "ISSUED") return `Emitida el ${formatDate(row.issuedAt)}`;
  if (row.status === "VOIDED") return `Anulada el ${formatDate(row.voidedAt)}`;
  return undefined;
}

export function InvoicesScreen() {
  const toast = useToast();
  const item = navItem("invoices");
  const { params, query } = useListQuery<InvoiceRow>("/admin/invoices", FILTERS, RULES);
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function start(invoice: InvoiceRow, action: InvoiceAction) {
    setPending({ invoice, action });
    setAttempt((value) => value + 1);
    setOpen(true);
  }

  function done() {
    if (pending) toast({ message: DONE[pending.action] });
    setOpen(false);
    query.reload();
  }

  const columns: Column<InvoiceRow>[] = [
    { key: "receiver", header: "Receptor", width: "sm", cell: (row) => <ReceiverCell receiver={row.receiver} /> },
    { key: "customer", header: "Cliente", type: "id", cell: (row) => <CustomerCell userId={row.userId} /> },
    { key: "amount", header: "Monto", type: "money", cell: (row) => <Amount money={row.amount} code /> },
    {
      key: "status",
      header: "Estado",
      type: "status",
      cell: (row) => <Stack main={<StatusTag status={INVOICE_STATUS[row.status]} />} detail={statusDate(row)} />,
    },
    {
      key: "number",
      header: "Número",
      type: "id",
      cell: (row) => (row.invoiceNumber ? row.invoiceNumber : <span className="sub-text">Sin número</span>),
    },
    { key: "created", header: "Pago registrado", type: "date", cell: (row) => <DateText value={row.createdAt} /> },
    {
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) =>
        row.status === "VOIDED" ? (
          <NoAction />
        ) : (
          <RowActions>
            {row.status === "PENDING" ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                aria-label={`Marcar emitida la factura ${row.id.slice(0, 8)}`}
                onClick={() => start(row, "issue")}
              >
                Marcar emitida
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-danger btn-sm"
              aria-label={`Anular la factura ${row.invoiceNumber ?? row.id.slice(0, 8)}`}
              onClick={() => start(row, "void")}
            >
              Anular
            </button>
          </RowActions>
        ),
    },
  ];

  return (
    <Screen title={item.label} description={item.description}>
      <ListView
        caption="Facturas"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay facturas"
        emptyHint="Cada pago aprobado deja una factura para emitir."
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Estado"
              value={params.value("status")}
              options={INVOICE_STATUS_OPTIONS}
              allLabel="Todas"
              onChange={(value) => params.setFilter("status", value)}
            />
            <DateFilter label="Desde" value={params.value("from")} onChange={(value) => params.setFilter("from", value)} />
            <DateFilter label="Hasta" value={params.value("to")} onChange={(value) => params.setFilter("to", value)} />
          </FilterBar>
        }
      />
      {pending ? (
        <InvoiceDialog
          key={attempt}
          invoice={pending.invoice}
          action={pending.action}
          open={open}
          today={todayInBuenosAires()}
          onClose={() => setOpen(false)}
          onDone={done}
        />
      ) : null}
    </Screen>
  );
}
