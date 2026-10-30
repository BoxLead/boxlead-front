import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { PasswordField } from "../../components/AuthLayout/PasswordField";
import { Loading } from "../../components/Loading";
import { resetPassword } from "../../data/account";
import { isInvalidLink, takeFragmentToken } from "../../util/fragmentToken";

const MIN_PASSWORD_LENGTH = 8;

type Step = "reading" | "form" | "invalid" | "done";

function resetError(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return error.message;
  if (error instanceof ApiError && error.status === 400) {
    return i18next.t("reset.tooShort", { ns: "auth", count: MIN_PASSWORD_LENGTH });
  }
  return i18next.t("reset.failed", { ns: "auth" });
}

export function ResetPassword() {
  const { t } = useTranslation("auth");
  const [step, setStep] = useState<Step>("reading");
  const [token, setToken] = useState<string | null>(null);
  const taken = useRef<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taken.current === undefined) taken.current = takeFragmentToken();
    const found = taken.current;
    queueMicrotask(() => {
      setToken(found);
      setStep(found ? "form" : "invalid");
    });
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setStep("done");
    } catch (failure) {
      if (isInvalidLink(failure)) setStep("invalid");
      else setError(resetError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">{t("reset.title")}</h1>
      {step === "reading" ? <Loading inline /> : null}
      {step === "invalid" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            {t("reset.invalid")}
          </p>
          <p className="auth-footer">
            <Link to="/recuperar-clave">{t("reset.newLink")}</Link>
          </p>
        </div>
      ) : null}
      {step === "done" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="status">
            {t("reset.done")}
          </p>
          <Link className="auth-submit auth-action" to="/login">
            {t("reset.signIn")}
          </Link>
        </div>
      ) : null}
      {step === "form" ? (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? (
            <div className="auth-error" role="alert">
              {error}
            </div>
          ) : null}
          <PasswordField
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            hint={t("password.atLeast", { count: MIN_PASSWORD_LENGTH })}
            value={password}
            onChange={setPassword}
          />
          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? t("reset.submitting") : t("reset.submit")}
          </button>
        </form>
      ) : null}
    </AuthLayout>
  );
}
