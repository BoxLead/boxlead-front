import { ReasonDialog } from "../../components/ReasonDialog";
import { retryRefund } from "./api";
import { ShortId } from "./cells";
import type { RefundResult, RefundRow } from "./types";

type RetryRefundDialogProps = {
  refund: RefundRow;
  open: boolean;
  onClose: () => void;
  onDone: (result: RefundResult) => void;
  onSettled?: (failure: unknown) => void;
};

export function RetryRefundDialog({ refund, open, onClose, onDone, onSettled }: RetryRefundDialogProps) {
  async function confirm(reason: string) {
    onDone(await retryRefund(refund.id, reason));
  }

  return (
    <ReasonDialog
      open={open}
      title="Reintentar reembolso"
      confirmLabel="Reintentar"
      amount={refund.effectiveAmount}
      onConfirm={confirm}
      onClose={onClose}
      onSettled={onSettled}
    >
      <p>
        Mercado Pago no llegó a responder este reembolso del pago <ShortId id={refund.paymentId} /> y no le dio un id. Lo mandamos de nuevo con la
        misma clave, así no se devuelve dos veces.
      </p>
      <p>{refund.amount ? "Es un reembolso parcial." : "Es un reembolso total y devuelve lo que quedaba del pago cuando se pidió."}</p>
    </ReasonDialog>
  );
}
