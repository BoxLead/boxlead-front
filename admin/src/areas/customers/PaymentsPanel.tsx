import { Link, useParams } from "react-router-dom";
import { DateText } from "../../components/DateText";
import { DataTable } from "../../components/list/DataTable";
import { Money } from "../../components/Money";
import { StatusBadge } from "../../components/StatusBadge";
import { PAYMENT_STATUS } from "../../status";
import { refundInProgress } from "../billing/money";
import { INVOICE_LABELS } from "./labels";
import { Muted, Section } from "./parts";
import type { Payment } from "./types";

function invoiceText(payment: Payment): string {
  if (!payment.invoice) return "Sin factura";
  const status = INVOICE_LABELS[payment.invoice.status];
  return payment.invoice.invoiceNumber ? `${status}, ${payment.invoice.invoiceNumber}` : status;
}

function Refunded({ payment }: { payment: Payment }) {
  const waiting = refundInProgress(payment);
  if (payment.refunded.amountMinor <= 0 && waiting.amountMinor <= 0) return "—";
  return (
    <span className="cell-stack">
      {payment.refunded.amountMinor > 0 ? <Money money={payment.refunded} /> : null}
      {waiting.amountMinor > 0 ? (
        <span className="sub-text">
          Pedido y sin acreditar <Money money={waiting} />
        </span>
      ) : null}
    </span>
  );
}

export function PaymentsPanel({ payments }: { payments: Payment[] }) {
  return (
    <Section title="Pagos" hint="Los últimos 20, con su factura." flush wide actions={payments.length > 0 ? <AllPaymentsLink /> : null}>
      {payments.length === 0 ? (
        <Muted>Todavía no tiene pagos.</Muted>
      ) : (
        <DataTable
          caption="Pagos del usuario"
          rows={payments}
          rowKey={(row) => row.id}
          columns={[
            { key: "date", header: "Fecha", type: "date", cell: (row) => <DateText value={row.approvedAt ?? row.createdAt} time /> },
            { key: "amount", header: "Monto", type: "money", cell: (row) => <Money money={row.amount} code /> },
            {
              key: "refunded",
              header: "Reembolsado",
              type: "money",
              cell: (row) => <Refunded payment={row} />,
            },
            { key: "fee", header: "Costo de Mercado Pago", type: "money", cell: (row) => (row.providerFee ? <Money money={row.providerFee} /> : "—") },
            {
              key: "status",
              header: "Estado",
              type: "status",
              cell: (row) => <StatusBadge status={PAYMENT_STATUS[row.status]} detail={row.statusDetail} />,
            },
            { key: "invoice", header: "Factura", cell: invoiceText },
          ]}
        />
      )}
    </Section>
  );
}

function AllPaymentsLink() {
  const { userId = "" } = useParams();
  return (
    <Link className="btn btn-secondary btn-sm" to={`/pagos?${new URLSearchParams({ userId }).toString()}`}>
      Ver todos en Pagos
    </Link>
  );
}
