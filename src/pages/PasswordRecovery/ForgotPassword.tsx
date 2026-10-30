import { useTranslation } from "react-i18next";
import { RichText } from "../../i18n/RichText";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Loading } from "../../components/Loading";
import { requestPasswordReset } from "../../data/account";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { SUPPORT_EMAIL } from "../../util/company";

export function ForgotPassword() {
  const { t } = useTranslation("auth");
  const options = useAuthOptions();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 429) setError(failure.message);
      else setError(t("recovery.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">{t("recovery.title")}</h1>
      {options === null ? (
        <Loading inline />
      ) : !options.passwordReset ? (
        <div className="auth-stack">
          <p className="auth-notice">
            <RichText text={t("recovery.unavailable", { email: SUPPORT_EMAIL })} />
          </p>
          <p className="auth-footer">
            <Link to="/login">{t("recovery.backToLogin")}</Link>
          </p>
        </div>
      ) : sent ? (
        <div className="auth-stack">
          <p className="auth-notice" role="status">
            {t("recovery.sent")}
          </p>
          <p className="auth-footer">
            <Link to="/login">{t("recovery.backToLogin")}</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="auth-subtitle">{t("recovery.subtitle")}</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="auth-error" role="alert">
                {error}
              </div>
            ) : null}
            <label className="auth-label">
              {t("fields.email")}
              <input
                className="auth-input"
                type="email"
                name="email"
                autoComplete="email"
                placeholder={t("fields.emailPlaceholder")}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="auth-submit" type="submit" disabled={sending}>
              {sending ? t("recovery.submitting") : t("recovery.submit")}
            </button>
          </form>
          <p className="auth-footer">
            {t("recovery.remembered")} <Link to="/login">{t("recovery.signIn")}</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
