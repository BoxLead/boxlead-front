import { useId, useState } from "react";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { ReasonDialog } from "../../components/ReasonDialog";
import { formatMoney } from "../../format";
import { invalidInput, refundPayment } from "./api";
import { Amount } from "./cells";
import { parseAmount, refundable } from "./money";
import type { PaymentRow, RefundResult } from "./types";

type Mode = "full" | "partial";

type RefundDialogProps = {
  payment: PaymentRow;
  open: boolean;
  onClose: () => void;
  onDone: (result: RefundResult) => void;
};

const MODES = [
  { value: "full" as const, label: "Total" },
  { value: "partial" as const, label: "Parcial" },
];

export function RefundDialog({ payment, open, onClose, onDone }: RefundDialogProps) {
  const [mode, setMode] = useState<Mode>("full");
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const helpId = useId();
  const left = refundable(payment);
  const parsed = parseAmount(text, left.currency);
  const valid = parsed !== null && parsed > 0 && parsed <= left.amountMinor;
  const amount = mode === "full" ? left : valid ? { amountMinor: parsed, currency: left.currency } : undefined;
  const showError = mode === "partial" && touched && !valid;

  async function confirm(reason: string) {
    if (mode === "partial" && !valid) {
      setTouched(true);
      throw invalidInput("Revisá el monto a reembolsar.");
    }
    const result = await refundPayment(payment.id, mode === "partial" && valid ? { amountMinor: parsed, currency: left.currency } : null, reason);
    onDone(result);
  }

  return (
    <ReasonDialog
      open={open}
      title="Reembolsar pago"
      confirmLabel="Reembolsar"
      tone="danger"
      amount={amount}
      onConfirm={confirm}
      onClose={onClose}
    >
      <p>
        Le devolvemos plata a {payment.email ?? "este cliente"} por Mercado Pago. Si deja en cero el último pago aprobado de la suscripción,
        primero se cancela la suscripción.
      </p>
      <dl className="billing-facts">
        <div>
          <dt>Cobrado</dt>
          <dd>
            <Amount money={payment.amount} />
          </dd>
        </div>
        <div>
          <dt>Ya reembolsado</dt>
          <dd>
            <Amount money={payment.refunded} />
          </dd>
        </div>
        <div>
          <dt>Queda para reembolsar</dt>
          <dd>
            <strong>
              <Amount money={left} />
            </strong>
          </dd>
        </div>
      </dl>
      <ChoiceGroup label="Tipo de reembolso" variant="segmented" choices={MODES} value={mode} onChange={setMode} />
      {mode === "partial" ? (
        <div className="field">
          <label className="field-label" htmlFor={fieldId}>
            Monto a reembolsar en {left.currency}
          </label>
          <input
            id={fieldId}
            className="input num"
            inputMode="decimal"
            autoComplete="off"
            value={text}
            aria-invalid={showError ? true : undefined}
            aria-describedby={helpId}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => setTouched(true)}
          />
          <span id={helpId} className={showError ? "field-error" : "field-help"}>
            {showError
              ? `Ingresá un monto mayor a cero y de hasta ${formatMoney(left)}.`
              : `Hasta ${formatMoney(left)}. Un reembolso que Mercado Pago todavía no respondió también cuenta.`}
          </span>
        </div>
      ) : null}
    </ReasonDialog>
  );
}
