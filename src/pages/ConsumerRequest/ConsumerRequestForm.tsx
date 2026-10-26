import { useId, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { apiFieldErrors } from "../../api/errors";
import type { ConsumerRequestKind, ConsumerRequestReceipt } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { CharCounter } from "../../components/ui/CharCounter";
import { SUPPORT_EMAIL } from "../../util/company";
import { DETAILS_MAX, REQUEST_TITLES, fallbackMailto, isRateLimited, isReceipt } from "./consumerRequest";
import "./ConsumerRequest.css";

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; receipt: ConsumerRequestReceipt; email: string }
  | { state: "failed"; rateLimited: boolean };

type ConsumerRequestFormProps = {
  kind: ConsumerRequestKind;
  submitLabel: string;
  sentText: string;
};

export function ConsumerRequestForm({ kind, submitLabel, sentText }: ConsumerRequestFormProps) {
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const emailId = useId();
  const detailsId = useId();
  const counterId = useId();
  const sending = status.state === "sending";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (details.length > DETAILS_MAX) return;
    setStatus({ state: "sending" });
    setFieldErrors({});
    const trimmed = details.trim();
    try {
      const receipt = await api.post<unknown>("/consumer-requests", {
        kind,
        email: email.trim(),
        ...(trimmed === "" ? {} : { details: trimmed }),
      });
      if (!isReceipt(receipt)) throw new Error("Invalid receipt");
      setStatus({ state: "sent", receipt, email: email.trim() });
    } catch (error) {
      const fields = apiFieldErrors(error);
      if (fields.length > 0) {
        setFieldErrors(Object.fromEntries(fields.map(({ field, message }) => [field, message])));
        setStatus({ state: "idle" });
        return;
      }
      setStatus({ state: "failed", rateLimited: isRateLimited(error) });
    }
  }

  if (status.state === "sent") {
    return (
      <section className="consumer-receipt" role="status" aria-labelledby={`${emailId}-receipt`}>
        <h2 id={`${emailId}-receipt`}>Recibimos tu pedido</h2>
        <p>Tu código de pedido es</p>
        <p className="consumer-receipt-code">{status.receipt.code}</p>
        <p>
          Guardalo. {sentText} a <strong>{status.email}</strong>. Si no te llega, escribinos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> con ese código.
        </p>
      </section>
    );
  }

  const emailError = fieldErrors.email;
  const detailsError = fieldErrors.details;

  return (
    <form className="consumer-form" onSubmit={handleSubmit}>
      {status.state === "failed" ? (
        <Banner tone="danger" title="No pudimos registrar tu pedido">
          <p>
            {status.rateLimited ? "Hiciste demasiados intentos seguidos. " : ""}
            Mandalo por email a{" "}
            <a href={fallbackMailto(kind, email)}>{SUPPORT_EMAIL}</a> con el asunto «{REQUEST_TITLES[kind]}» y el email de tu
            cuenta. Te respondemos con el código del pedido dentro de las 24 horas.
          </p>
        </Banner>
      ) : null}
      <div className="field">
        <label className="field-label" htmlFor={emailId}>
          Email de tu cuenta
        </label>
        <input
          id={emailId}
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${emailId}-error` : undefined}
        />
        {emailError ? (
          <p className="field-error" id={`${emailId}-error`}>
            Revisá el email.
          </p>
        ) : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={detailsId}>
          Detalle (opcional)
        </label>
        <textarea
          id={detailsId}
          className="input consumer-form-details"
          name="details"
          rows={4}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          aria-invalid={detailsError || details.length > DETAILS_MAX ? true : undefined}
          aria-describedby={counterId}
        />
        <div className="consumer-form-hint">
          <span className="field-help">Si querés, contanos algo más en pocas palabras.</span>
          <CharCounter id={counterId} length={details.length} max={DETAILS_MAX} />
        </div>
        {detailsError ? <p className="field-error">Revisá el detalle.</p> : null}
      </div>
      <button className="btn btn-primary consumer-form-submit" type="submit" disabled={sending || details.length > DETAILS_MAX}>
        {sending ? "Enviando…" : submitLabel}
      </button>
    </form>
  );
}
