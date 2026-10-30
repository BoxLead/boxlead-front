import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { apiErrorCode, apiFieldErrors } from "../../api/errors";
import type { BillingPlan, LegalDocument, PaidPlanCode } from "../../api/types";
import { Dialog } from "../../components/ui/Dialog";
import { CheckoutUrlError, fetchCheckoutLegal, startCheckout } from "../../data/subscription";
import { emptyProfile, isEmail } from "../../util/billingProfile";
import { checkoutLegal } from "../../util/checkout";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "../../util/company";
import { nationalTaxesLegend, planPrice } from "../../util/planPrice";
import { billingErrorMessage, MERCADO_PAGO_BANNER, MERCADO_PAGO_TERMS_URL, rateNote } from "./billingLabels";
import { LegalConsent } from "./LegalConsent";
import { ProfileForm } from "./ProfileForm";

type CheckoutDialogProps = {
  plan: BillingPlan;
  planCode: PaidPlanCode;
  profileComplete: boolean;
  userEmail: string;
  onClose: () => void;
};

type Legal = { status: "loading" } | { status: "error" } | { status: "ready"; documents: LegalDocument[] };

export function CheckoutDialog({ plan, planCode, profileComplete, userEmail, onClose }: CheckoutDialogProps) {
  const { t } = useTranslation("billing");
  const emailId = useId();
  const emailHelpId = useId();
  const emailErrorId = useId();
  const [step, setStep] = useState<"profile" | "summary">(profileComplete ? "summary" : "profile");
  const [payerEmail, setPayerEmail] = useState(userEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [legal, setLegal] = useState<Legal>({ status: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const price = planPrice(plan);
  const note = price ? rateNote(price.rateDay) : null;

  const fetchLegal = useCallback(() => {
    fetchCheckoutLegal().then(
      (documents) => setLegal({ status: "ready", documents }),
      () => setLegal({ status: "error" }),
    );
  }, []);

  useEffect(() => {
    fetchLegal();
  }, [fetchLegal]);

  function loadLegal() {
    setLegal({ status: "loading" });
    fetchLegal();
  }

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (busy || legal.status !== "ready") return;
    setError(null);
    if (!isEmail(payerEmail)) {
      setEmailError(t("checkout.payerEmailError"));
      return;
    }
    if (!accepted) {
      setError(t("checkout.acceptRequired"));
      return;
    }
    setBusy(true);
    try {
      const url = await startCheckout(planCode, payerEmail.trim(), checkoutLegal(legal.documents));
      window.location.assign(url);
    } catch (failure) {
      setBusy(false);
      const code = apiErrorCode(failure);
      if (code === "BILLING_PROFILE_REQUIRED") {
        setStep("profile");
        return;
      }
      if (code === "LEGAL_ACCEPTANCE_REQUIRED") {
        setAccepted(false);
        loadLegal();
      }
      if (apiFieldErrors(failure).some((field) => field.field === "payerEmail")) {
        setEmailError(t("checkout.payerEmailError"));
        return;
      }
      setError(
        failure instanceof CheckoutUrlError
          ? t("checkout.openFailed", { email: SUPPORT_EMAIL })
          : billingErrorMessage(failure, t("checkout.startFailed")),
      );
    }
  }

  if (step === "profile") {
    return (
      <Dialog
        open
        title={t("checkout.profileTitle")}
        description={t("checkout.profileDescription", { plan: plan.name })}
        size="lg"
        busy={busy}
        onClose={onClose}
      >
        <ProfileForm
          initial={emptyProfile(userEmail)}
          submitLabel={t("checkout.continue")}
          onBusyChange={setBusy}
          onCancel={onClose}
          onSaved={() => setStep("summary")}
        />
      </Dialog>
    );
  }

  return (
    <Dialog open title={t("plans.buy", { plan: plan.name })} size="lg" busy={busy} onClose={onClose}>
      <form className="dialog-form checkout" onSubmit={(event) => void pay(event)} noValidate>
        <section className="checkout-summary" aria-label={t("checkout.summary")}>
          <dl className="checkout-terms">
            <div>
              <dt>{t("checkout.provider")}</dt>
              <dd>
                <Trans
                  t={t}
                  i18nKey="checkout.providerValue"
                  values={{ name: LEGAL_ENTITY_NAME, email: SUPPORT_EMAIL }}
                  components={{ mail: <a href={`mailto:${SUPPORT_EMAIL}`} /> }}
                />
              </dd>
            </div>
            <div>
              <dt>{t("checkout.plan")}</dt>
              <dd>{plan.name}</dd>
            </div>
            {price ? (
              <div>
                <dt>{plan.priceIncludesVat ? t("price.finalWithVat") : t("price.final")}</dt>
                <dd>
                  <span className="checkout-price">
                    {price.amount} {price.period}
                  </span>
                  {note ? <span className="checkout-note">{note}</span> : null}
                  {price.withoutNationalTaxes ? (
                    <span className="checkout-net">
                      {nationalTaxesLegend()} {price.withoutNationalTaxes}
                    </span>
                  ) : null}
                  {price.reference ? (
                    <span className="checkout-note">{t("price.reference", { price: price.reference })}</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{t("checkout.renewal")}</dt>
              <dd>{t("checkout.renewalText")}</dd>
            </div>
            <div>
              <dt>{t("checkout.cancellation")}</dt>
              <dd>{t("checkout.cancellationText")}</dd>
            </div>
            <div>
              <dt>{t("checkout.withdrawal")}</dt>
              <dd>{t("checkout.withdrawalText")}</dd>
            </div>
          </dl>
        </section>

        <div className="field">
          <label className="field-label" htmlFor={emailId}>
            {t("checkout.payerEmail")}
          </label>
          <input
            id={emailId}
            className="input"
            name="payerEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={payerEmail}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? `${emailErrorId} ${emailHelpId}` : emailHelpId}
            onChange={(event) => {
              setPayerEmail(event.target.value);
              setEmailError(null);
            }}
          />
          {emailError ? (
            <span id={emailErrorId} className="field-error">
              {emailError}
            </span>
          ) : null}
          <span id={emailHelpId} className="field-help">
            {t("checkout.payerEmailHelp")}
          </span>
        </div>

        <div className="checkout-provider">
          <img
            className="checkout-provider-banner"
            src={MERCADO_PAGO_BANNER}
            width={468}
            height={60}
            alt={t("checkout.bannerAlt")}
          />
          <p>
            <Trans
              t={t}
              i18nKey="checkout.processor"
              components={{ terms: <a href={MERCADO_PAGO_TERMS_URL} target="_blank" rel="noopener noreferrer" /> }}
            />
          </p>
        </div>

        <LegalConsent
          state={legal.status}
          documents={legal.status === "ready" ? legal.documents : []}
          checked={accepted}
          disabled={busy}
          onChange={(value) => {
            setAccepted(value);
            setError(null);
          }}
          onRetry={loadLegal}
        />

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || legal.status !== "ready"}>
            {busy ? t("checkout.opening") : t("checkout.pay")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
