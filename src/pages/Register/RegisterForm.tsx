import { type FormEvent, useId, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { trackEvent } from "../../analytics/gtag";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { PasswordField } from "../../components/AuthLayout/PasswordField";
import { SocialButtons } from "../../components/AuthLayout/SocialButtons";
import { PlanPicker } from "../../components/PlanPicker/PlanPicker";
import { useAuth } from "../../context/auth";
import { RichText } from "../../i18n/RichText";
import {
  choiceFromQuery,
  hasChoices,
  isPaidPlan,
  signupDestination,
  type SignupChoice,
  type SignupOptions,
} from "../../data/plans";

const MIN_PASSWORD_LENGTH = 8;

type RegisterFormProps = {
  options: SignupOptions;
  next: string;
  planParam: string | null;
};

export function RegisterForm({ options, next, planParam }: RegisterFormProps) {
  const { t } = useTranslation("auth");
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
      <h1 className="auth-title">{t("register.title")}</h1>
      <p className="auth-subtitle">{t("register.subtitle")}</p>
      {plans ? (
        <PlanPicker
          ref={pickerRef}
          plans={plans}
          invitation={invitation}
          value={choice}
          onChange={choose}
          error={planError ? t("register.planRequired") : null}
        />
      ) : null}
      {isPaidPlan(choice) ? (
        <p className="auth-hint auth-plan-hint">{t("register.paidHint")}</p>
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
              <Trans
                t={t}
                i18nKey="register.accept"
                components={{
                  terms: <a href={legal.termsUrl} target="_blank" rel="noopener noreferrer" />,
                  privacy: <a href={legal.privacyUrl} target="_blank" rel="noopener noreferrer" />,
                }}
              />
            </span>
          </label>
          {legalError ? (
            <p className="form-error" id={legalErrorId} role="alert">
              {t("register.legalRequired")}
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
            {t("fields.name")} <span className="auth-optional">{t("fields.optional")}</span>
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
          {t("fields.email")}
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("fields.emailPlaceholder")}
            required
            readOnly={invitedEmail !== null}
            aria-describedby={invitedEmail ? emailHintId : undefined}
            value={invitedEmail ?? email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {invitedEmail ? (
            <span className="auth-hint" id={emailHintId}>
              {t("register.invitedEmail")}
            </span>
          ) : null}
        </label>
        <PasswordField
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          hint={t("password.minimum", { count: MIN_PASSWORD_LENGTH })}
          value={password}
          onChange={setPassword}
        />
        <button className="auth-submit" type="submit" disabled={isLoading}>
          {isLoading ? t("register.submitting") : t("register.submit")}
        </button>
      </form>
      {mustAccept ? null : (
        <p className="auth-terms">
          <RichText text={t("register.terms")} />
        </p>
      )}
      <p className="auth-footer">
        {t("register.haveAccount")} <Link to="/login">{t("register.signIn")}</Link>
      </p>
    </AuthLayout>
  );
}
