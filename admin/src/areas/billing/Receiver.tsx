import { formatCuit, vatConditionLabel } from "../../../../src/util/taxId";
import type { InvoiceReceiver } from "./types";

function receiverName(receiver: InvoiceReceiver | null): string | null {
  return receiver?.legalName?.trim() ? receiver.legalName : null;
}

export function Receiver({ receiver }: { receiver: InvoiceReceiver | null }) {
  const name = receiverName(receiver);
  if (!receiver || !name) return <p className="sub-text">El cliente no tenía datos fiscales cuando se registró el pago.</p>;
  const tax = receiver.taxId ? `${receiver.taxIdType ?? "CUIT"} ${receiver.taxIdType === "CUIT" || !receiver.taxIdType ? formatCuit(receiver.taxId) : receiver.taxId}` : null;
  return (
    <dl className="billing-facts">
      <div>
        <dt>Receptor</dt>
        <dd>{name}</dd>
      </div>
      {tax ? (
        <div>
          <dt>Documento</dt>
          <dd className="num">{tax}</dd>
        </div>
      ) : null}
      {receiver.vatCondition ? (
        <div>
          <dt>Condición frente al IVA</dt>
          <dd>{vatConditionLabel(receiver.vatCondition)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function ReceiverCell({ receiver }: { receiver: InvoiceReceiver | null }) {
  const name = receiverName(receiver);
  if (!receiver || !name) return <span className="sub-text">Sin datos fiscales</span>;
  return (
    <span className="cell-stack">
      <span>{name}</span>
      {receiver.vatCondition ? <span className="sub-text">{vatConditionLabel(receiver.vatCondition)}</span> : null}
    </span>
  );
}
