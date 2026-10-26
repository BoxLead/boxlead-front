import { type FormEvent, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "../../analytics/gtag";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { PasswordField } from "../../components/AuthLayout/PasswordField";
import { SocialButtons } from "../../components/AuthLayout/SocialButtons";
import { PlanPicker } from "../../components/PlanPicker/PlanPicker";
import { useAuth } from "../../context/auth";
import {
  choiceFromQuery,
  hasChoices,
  isPaidPlan,
  signupDestination,
  type SignupChoice,
  type SignupOptions,
} from "../../data/plans";

const MIN_PASSWORD_LENGTH = 8;
const PLAN_REQUIRED = "Elegí un plan para seguir.";
const LEGAL_REQUIRED = "Aceptá los términos y la política de privacidad para seguir.";

type RegisterFormProps = {
  options: SignupOptions;
  next: string;
  planParam: string | null;
};

export function RegisterForm({ options, next, planParam }: RegisterFormProps) {
  const { plans, invitation, legal } = options;
  const { register, isLoading, error, clearError } = useAuth();
  const invitedEmail = plans?.beta && invitation.status === "valid" ? invitation.invitation.email : null;
  const mustPick = plans !== null && hasChoices(plans);
  const mustAccept = legal !== null && legal.versions.length > 0;

  const [choice, setChoice] = useState<SignupChoice | null>(() =>
    plans ? choiceFromQuery(planParam, plans, invitation) : null,
  );
  const [email, setEmail] = useState(invitedEmail ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [planError, setPlanError] = useState(false);
  const [legalError, setLegalError] = useState(false);
  const pickerRef = useRef<HTMLFieldSetElement>(null);
  const legalRef = useRef<HTMLInputElement>(null);
  const legalErrorId = useId();
  const emailHintId = useId();
  const started = useRef(false);

  function handleStart() {
    if (started.current) return;
    started.current = true;
    trackEvent("registro_inicio");
  }

  const destination = signupDestination(choice, next);
  const acceptedLegal = mustAccept && accepted ? legal.versions : undefined;

  function canContinue(): boolean {
    const missingPlan = mustPick && choice === null;
    const missingLegal = mustAccept && !accepted;
    setPlanError(missingPlan);
    setLegalError(missingLegal);
    if (missingPlan) {
      pickerRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
    } else if (missingLegal) {
      legalRef.current?.focus();
    }
    return !missingPlan && !missingLegal;
  }

  function choose(value: SignupChoice) {
    setChoice(value);
    setPlanError(false);
  }

  function toggleLegal(checked: boolean) {
    setAccepted(checked);
    if (checked) setLegalError(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();
    if (!canContinue()) return;
    await register(
      {
        email: (invitedEmail ?? email).trim(),
        password,
        name: name.trim() || undefined,
        ...(acceptedLegal ? { acceptedLegal } : {}),
      },
      destination,
    );
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Crear cuenta</h1>
      <p className="auth-subtitle">Empezá a usar BoxLead en minutos.</p>
      {plans ? (
        <PlanPicker
          ref={pickerRef}
          plans={plans}
          invitation={invitation}
          value={choice}
          onChange={choose}
          error={planError ? PLAN_REQUIRED : null}
        />
      ) : null}
      {isPaidPlan(choice) ? (
        <p className="auth-hint auth-plan-hint">
          Después de crear la cuenta te pedimos los datos de facturación y pagás con Mercado Pago.
        </p>
      ) : null}
      {mustAccept ? (
        <div className="auth-consent">
          <label className="auth-check">
            <input
              ref={legalRef}
              type="checkbox"
              name="acceptedLegal"
              checked={accepted}
              aria-invalid={legalError ? true : undefined}
              aria-describedby={legalError ? legalErrorId : undefined}
              onChange={(e) => toggleLegal(e.target.checked)}
            />
            <span>
              Leí y acepto los{" "}
              <a href={legal.termsUrl} target="_blank" rel="noopener noreferrer">
                Términos y condiciones
              </a>{" "}
              y la{" "}
              <a href={legal.privacyUrl} target="_blank" rel="noopener noreferrer">
                Política de privacidad
              </a>
              .
            </span>
          </label>
          {legalError ? (
            <p className="form-error" id={legalErrorId} role="alert">
              {LEGAL_REQUIRED}
            </p>
          ) : null}
        </div>
      ) : null}
      <SocialButtons next={destination} acceptedLegal={acceptedLegal} canStart={canContinue} />
      <form className="auth-form" onSubmit={handleSubmit} onFocusCapture={handleStart}>
        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
        <label className="auth-label">
          <span>
            Nombre <span className="auth-optional">(opcional)</span>
          </span>
          <input
            className="auth-input"
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="auth-label">
          Email
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="vos@tuempresa.com"
            required
            readOnly={invitedEmail !== null}
            aria-describedby={invitedEmail ? emailHintId : undefined}
            value={invitedEmail ?? email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {invitedEmail ? (
            <span className="auth-hint" id={emailHintId}>
              Es el email de tu invitación y no se puede cambiar.
            </span>
          ) : null}
        </label>
        <PasswordField
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
          value={password}
          onChange={setPassword}
        />
        <button className="auth-submit" type="submit" disabled={isLoading}>
          {isLoading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      {mustAccept ? null : (
        <p className="auth-terms">
          Al crear tu cuenta aceptás los{" "}
          <Link to="/terms-of-service">Términos de servicio</Link> y la{" "}
          <Link to="/privacy-policy">Política de privacidad</Link>.
        </p>
      )}
      <p className="auth-footer">
        ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
