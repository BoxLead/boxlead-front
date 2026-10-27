import type { AdminPage } from "../../api/types";
import { ReasonDialog } from "../../components/ReasonDialog";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { retryRefund } from "./api";
import { ShortId } from "./cells";
import { refundable } from "./money";
import type { PaymentRow, RefundResult, RefundRow } from "./types";

type RetryRefundDialogProps = {
  refund: RefundRow;
  open: boolean;
  onClose: () => void;
  onDone: (result: RefundResult) => void;
};

function useFullAmount(refund: RefundRow) {
  const lookup = useAdminQuery<AdminPage<PaymentRow>>(
    refund.amount ? null : "/admin/payments",
    new URLSearchParams({ userId: refund.userId }).toString(),
  );
  if (refund.amount) return { status: "ready" as const, amount: refund.amount };
  if (lookup.status !== "ready") return { status: lookup.status, amount: undefined };
  const payment = lookup.data.items.find((item) => item.id === refund.paymentId);
  return { status: payment ? ("ready" as const) : ("missing" as const), amount: payment ? refundable(payment) : undefined };
}

export function RetryRefundDialog({ refund, open, onClose, onDone }: RetryRefundDialogProps) {
  const full = useFullAmount(refund);

  async function confirm(reason: string) {
    onDone(await retryRefund(refund.id, reason));
  }

  return (
    <ReasonDialog
      open={open}
      title="Reintentar reembolso"
      confirmLabel="Reintentar"
      amount={full.amount}
      onConfirm={confirm}
      onClose={onClose}
    >
      <p>
        Mercado Pago no respondió este reembolso del pago <ShortId id={refund.paymentId} />. Lo mandamos de nuevo con la misma clave, así no se
        devuelve dos veces.
      </p>
      {refund.amount ? (
        <p>Es un reembolso parcial.</p>
      ) : full.status === "loading" ? (
        <p className="sub-text" role="status">
          Buscando cuánto quedaba del pago…
        </p>
      ) : full.status === "ready" ? (
        <p>Es un reembolso total y devuelve lo que quedaba del pago.</p>
      ) : (
        <p>Es un reembolso total y devuelve lo que quedaba del pago. No pudimos traer el monto, miralo en Pagos antes de confirmar.</p>
      )}
    </ReasonDialog>
  );
}
