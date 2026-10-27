import { useId, useState } from "react";
import { ReasonDialog } from "../../components/ReasonDialog";
import { invalidInput, markInvoiceIssued, markInvoiceVoided } from "./api";
import { Receiver } from "./Receiver";
import type { InvoiceRow } from "./types";

export type InvoiceAction = "issue" | "void";

const MAX_INVOICE_NUMBER = 50;

type InvoiceDialogProps = {
  invoice: InvoiceRow;
  action: InvoiceAction;
  open: boolean;
  today: string;
  onClose: () => void;
  onDone: (invoice: InvoiceRow) => void;
  onSettled?: (failure: unknown) => void;
};

function IssueFields({ number, date, today, touched, onNumber, onDate }: {
  number: string;
  date: string;
  today: string;
  touched: boolean;
  onNumber: (value: string) => void;
  onDate: (value: string) => void;
}) {
  const numberId = useId();
  const numberHelp = useId();
  const dateId = useId();
  const dateHelp = useId();
  const missing = touched && number.trim().length === 0;
  return (
    <div className="billing-fields">
      <div className="field">
        <label className="field-label" htmlFor={numberId}>
          Número de factura
        </label>
        <input
          id={numberId}
          className="input num"
          autoComplete="off"
          maxLength={MAX_INVOICE_NUMBER}
          value={number}
          aria-invalid={missing ? true : undefined}
          aria-describedby={numberHelp}
          onChange={(event) => onNumber(event.target.value)}
        />
        <span id={numberHelp} className={missing ? "field-error" : "field-help"}>
          {missing ? "Ingresá el número de la factura." : "El número que dio el sistema de facturación."}
        </span>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={dateId}>
          Fecha de emisión
        </label>
        <input
          id={dateId}
          className="input"
          type="date"
          max={today}
          value={date}
          aria-describedby={dateHelp}
          onChange={(event) => onDate(event.target.value)}
        />
        <span id={dateHelp} className="field-help">
          Opcional. Sin fecha queda la de hoy.
        </span>
      </div>
    </div>
  );
}

export function InvoiceDialog({ invoice, action, open, today, onClose, onDone, onSettled }: InvoiceDialogProps) {
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [touched, setTouched] = useState(false);
  const issuing = action === "issue";

  async function confirm(reason: string) {
    if (!issuing) {
      onDone(await markInvoiceVoided(invoice.id, reason));
      return;
    }
    const trimmed = number.trim();
    if (!trimmed) {
      setTouched(true);
      throw invalidInput("Ingresá el número de la factura.");
    }
    if (date && date > today) throw invalidInput("La fecha de emisión no puede ser futura.");
    onDone(await markInvoiceIssued(invoice.id, trimmed, date ? `${date}T00:00:00-03:00` : null, reason));
  }

  return (
    <ReasonDialog
      open={open}
      title={issuing ? "Marcar factura emitida" : "Anular factura"}
      confirmLabel={issuing ? "Marcar emitida" : "Anular factura"}
      tone={issuing ? "primary" : "danger"}
      amount={invoice.amount}
      onConfirm={confirm}
      onClose={onClose}
      onSettled={onSettled}
    >
      {issuing ? (
        <p>Anotá el número de la factura que emitiste fuera de BoxLead para este pago.</p>
      ) : (
        <p>
          La factura {invoice.invoiceNumber ?? ""} queda anulada en BoxLead y no vuelve atrás. La nota de crédito se hace fuera de BoxLead.
        </p>
      )}
      <Receiver receiver={invoice.receiver} />
      {issuing ? <IssueFields number={number} date={date} today={today} touched={touched} onNumber={setNumber} onDate={setDate} /> : null}
    </ReasonDialog>
  );
}
