import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { apiErrorCode, apiFieldErrors } from "../../api/errors";
import type { BillingPlan, LegalDocument, PaidPlanCode } from "../../api/types";
import { Dialog } from "../../components/ui/Dialog";
import { CheckoutUrlError, fetchCheckoutLegal, startCheckout } from "../../data/subscription";
import { emptyProfile, isEmail } from "../../util/billingProfile";
import { checkoutLegal } from "../../util/checkout";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "../../util/company";
import { NATIONAL_TAXES_LEGEND, planPrice } from "../../util/planPrice";
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
      setEmailError("Escribí el email de tu cuenta de Mercado Pago.");
      return;
    }
    if (!accepted) {
      setError("Para seguir tenés que aceptar las condiciones.");
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
        setEmailError("Escribí el email de tu cuenta de Mercado Pago.");
        return;
      }
      setError(
        failure instanceof CheckoutUrlError
          ? `No pudimos abrir el pago de Mercado Pago. Escribinos a ${SUPPORT_EMAIL}.`
          : billingErrorMessage(failure, "No pudimos iniciar el pago. Probá de nuevo."),
      );
    }
  }

  if (step === "profile") {
    return (
      <Dialog
        open
        title="Tus datos fiscales"
        description={`Antes de contratar ${plan.name} necesitamos tus datos para hacerte la factura.`}
        size="lg"
        busy={busy}
        onClose={onClose}
      >
        <ProfileForm
          initial={emptyProfile(userEmail)}
          submitLabel="Seguir"
          onBusyChange={setBusy}
          onCancel={onClose}
          onSaved={() => setStep("summary")}
        />
      </Dialog>
    );
  }

  return (
    <Dialog open title={`Contratar ${plan.name}`} size="lg" busy={busy} onClose={onClose}>
      <form className="dialog-form checkout" onSubmit={(event) => void pay(event)} noValidate>
        <section className="checkout-summary" aria-label="Resumen de la compra">
          <dl className="checkout-terms">
            <div>
              <dt>Proveedor</dt>
              <dd>
                {LEGAL_ENTITY_NAME}, atención en <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{plan.name}</dd>
            </div>
            {price ? (
              <div>
                <dt>{plan.priceIncludesVat ? "Precio final con IVA" : "Precio final"}</dt>
                <dd>
                  <span className="checkout-price">
                    {price.amount} {price.period}
                  </span>
                  {note ? <span className="checkout-note">{note}</span> : null}
                  {price.withoutNationalTaxes ? (
                    <span className="checkout-net">
                      {NATIONAL_TAXES_LEGEND} {price.withoutNationalTaxes}
                    </span>
                  ) : null}
                  {price.reference ? (
                    <span className="checkout-note">Referencia {price.reference}</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Renovación</dt>
              <dd>
                Se cobra todos los meses hasta que lo des de baja. El monto en pesos sale del dólar oficial del Banco
                Nación del día de cada cobro.
              </dd>
            </div>
            <div>
              <dt>Baja</dt>
              <dd>
                Cuando quieras desde esta página, sin cargo. Seguís usando BoxLead hasta el final del período pagado.
              </dd>
            </div>
            <div>
              <dt>Arrepentimiento</dt>
              <dd>Tenés 10 días desde el primer cobro para arrepentirte y te devolvemos el total.</dd>
            </div>
          </dl>
        </section>

        <div className="field">
          <label className="field-label" htmlFor={emailId}>
            Email de tu cuenta de Mercado Pago
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
            Tiene que ser el mismo con el que entrás a Mercado Pago para pagar. Si pagás con otra cuenta, Mercado Pago
            rechaza el pago.
          </span>
        </div>

        <div className="checkout-provider">
          <img
            className="checkout-provider-banner"
            src={MERCADO_PAGO_BANNER}
            width={468}
            height={60}
            alt="Pagás a través de Mercado Pago con tarjetas de crédito y débito"
          />
          <p>
            El pago lo procesa Mercado Pago y también se rige por sus{" "}
            <a href={MERCADO_PAGO_TERMS_URL} target="_blank" rel="noopener noreferrer">
              términos y condiciones
            </a>
            . BoxLead no ve ni guarda los datos de tu tarjeta.
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
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || legal.status !== "ready"}>
            {busy ? "Abriendo Mercado Pago…" : "Ir a pagar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
