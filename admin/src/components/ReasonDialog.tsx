import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Banner } from "../../../src/components/ui/Banner";
import { CharCounter } from "../../../src/components/ui/CharCounter";
import { Dialog } from "../../../src/components/ui/Dialog";
import { errorText } from "../api/errors";
import type { Money } from "../api/types";
import { formatMoney } from "../format";
import { MAX_REASON, MIN_REASON, reasonProblem } from "./reason";
import "./ReasonDialog.css";

type ReasonDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  amount?: Money;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
};

type ReasonFormProps = Omit<ReasonDialogProps, "open" | "title">;

function ReasonForm({ children, confirmLabel, tone = "primary", amount, onConfirm, onClose }: ReasonFormProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const helpId = useId();
  const counterId = useId();
  const problem = reasonProblem(reason);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (failure) {
      setError(errorText(failure));
      setBusy(false);
    }
  }

  return (
    <form className="reason-form" onSubmit={submit} noValidate>
      <div className="reason-summary">{children}</div>
      {amount ? (
        <p className="reason-amount">
          <span>Monto</span>
          <strong className="num">{formatMoney(amount)}</strong>
          <span className="reason-currency">{amount.currency}</span>
        </p>
      ) : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <div className="field">
        <label className="field-label" htmlFor={fieldId}>
          Motivo
        </label>
        <textarea
          id={fieldId}
          className="input reason-input"
          name="reason"
          rows={3}
          required
          minLength={MIN_REASON}
          maxLength={MAX_REASON}
          disabled={busy}
          value={reason}
          aria-invalid={touched && problem ? true : undefined}
          aria-describedby={`${helpId} ${counterId}`}
          onChange={(event) => setReason(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        <div className="reason-meta">
          <span id={helpId} className={touched && problem ? "field-error" : "field-help"}>
            {touched && problem ? problem : `Queda en la auditoría. Al menos ${MIN_REASON} caracteres.`}
          </span>
          <CharCounter id={counterId} length={reason.length} max={MAX_REASON} />
        </div>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className={tone === "danger" ? "btn btn-danger" : "btn btn-primary"} disabled={busy || problem !== null}>
          {busy ? "Guardando…" : confirmLabel}
        </button>
      </div>
    </form>
  );
}

export function ReasonDialog({ open, title, ...form }: ReasonDialogProps) {
  return (
    <Dialog open={open} title={title} size="md" onClose={form.onClose}>
      {open ? <ReasonForm {...form} /> : null}
    </Dialog>
  );
}
