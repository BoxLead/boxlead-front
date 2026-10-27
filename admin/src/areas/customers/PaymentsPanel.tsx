import { Tag } from "../../../../src/components/ui/Tag";
import { DataTable } from "../../components/list/DataTable";
import { formatDateTime, formatMoney } from "../../format";
import { INVOICE_LABELS, PAYMENT_LABELS, PAYMENT_TONES } from "./labels";
import { Muted, Section } from "./parts";
import type { Payment } from "./types";

function invoiceText(payment: Payment): string {
  if (!payment.invoice) return "Sin factura";
  const status = INVOICE_LABELS[payment.invoice.status];
  return payment.invoice.invoiceNumber ? `${status}, ${payment.invoice.invoiceNumber}` : status;
}

function money(value: Payment["amount"] | null): string {
  return value ? `${formatMoney(value)} ${value.currency}` : "—";
}

export function PaymentsPanel({ payments }: { payments: Payment[] }) {
  return (
    <Section title="Pagos" hint="Los últimos 20, con su factura.">
      {payments.length === 0 ? (
        <Muted>Todavía no tiene pagos.</Muted>
      ) : (
        <div className="customer-table">
          <DataTable
            caption="Pagos del usuario"
            rows={payments}
            rowKey={(row) => row.id}
            columns={[
              { key: "date", header: "Fecha", cell: (row) => formatDateTime(row.approvedAt ?? row.createdAt) },
              { key: "amount", header: "Monto", align: "end", cell: (row) => money(row.amount) },
              {
                key: "refunded",
                header: "Reembolsado",
                align: "end",
                cell: (row) => (row.refunded.amountMinor > 0 ? money(row.refunded) : "—"),
              },
              { key: "fee", header: "Costo de Mercado Pago", align: "end", cell: (row) => money(row.providerFee) },
              {
                key: "status",
                header: "Estado",
                cell: (row) => (
                  <span>
                    <Tag tone={PAYMENT_TONES[row.status]}>{PAYMENT_LABELS[row.status]}</Tag>
                  </span>
                ),
              },
              { key: "invoice", header: "Factura", cell: invoiceText },
            ]}
          />
        </div>
      )}
    </Section>
  );
}
