import { useId, useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation("consumer");
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
        <h2 id={`${emailId}-receipt`}>{t("form.receiptTitle")}</h2>
        <p>{t("form.receiptCode")}</p>
        <p className="consumer-receipt-code">{status.receipt.code}</p>
        <p>
          <Trans
            t={t}
            i18nKey="form.receiptText"
            values={{ sent: sentText, email: status.email, support: SUPPORT_EMAIL }}
            components={{ email: <strong />, support: <a href={`mailto:${SUPPORT_EMAIL}`} /> }}
          />
        </p>
      </section>
    );
  }

  const emailError = fieldErrors.email;
  const detailsError = fieldErrors.details;

  return (
    <form className="consumer-form" onSubmit={handleSubmit}>
      {status.state === "failed" ? (
        <Banner tone="danger" title={t("form.failedTitle")}>
          <p>
            {status.rateLimited ? t("form.rateLimited") : ""}
            <Trans
              t={t}
              i18nKey="form.failedText"
              values={{ support: SUPPORT_EMAIL, subject: REQUEST_TITLES[kind] }}
              components={{ support: <a href={fallbackMailto(kind, email)} /> }}
            />
          </p>
        </Banner>
      ) : null}
      <div className="field">
        <label className="field-label" htmlFor={emailId}>
          {t("form.email")}
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
            {t("form.emailError")}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={detailsId}>
          {t("form.details")}
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
          <span className="field-help">{t("form.detailsHint")}</span>
          <CharCounter id={counterId} length={details.length} max={DETAILS_MAX} overLimitLabel={t("form.overLimit")} />
        </div>
        {detailsError ? <p className="field-error">{t("form.detailsError")}</p> : null}
      </div>
      <button className="btn btn-primary consumer-form-submit" type="submit" disabled={sending || details.length > DETAILS_MAX}>
        {sending ? t("form.sending") : submitLabel}
      </button>
    </form>
  );
}
