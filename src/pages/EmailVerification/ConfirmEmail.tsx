import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isInvalidLink, isRateLimited, takeFragmentToken } from "../../util/fragmentToken";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Loading } from "../../components/Loading";
import { verifyEmail } from "../../data/account";

type Step = "checking" | "done" | "invalid" | "limited" | "error";

export function ConfirmEmail() {
  const { t } = useTranslation("auth");
  const [step, setStep] = useState<Step>("checking");
  const taken = useRef<string | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (taken.current === undefined) taken.current = takeFragmentToken();
    const token = taken.current;
    if (!token) {
      queueMicrotask(() => setStep("invalid"));
      return;
    }
    verifyEmail(token).then(
      () => setStep("done"),
      (error: unknown) => setStep(isInvalidLink(error) ? "invalid" : isRateLimited(error) ? "limited" : "error"),
    );
  }, [attempt]);

  function retry() {
    setStep("checking");
    setAttempt((current) => current + 1);
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">{t("confirm.title")}</h1>
      {step === "checking" ? <Loading inline /> : null}
      {step === "done" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="status">
            {t("confirm.done")}
          </p>
          <Link className="auth-submit auth-action" to="/app/inbox">
            {t("confirm.goToApp")}
          </Link>
        </div>
      ) : null}
      {step === "invalid" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            {t("confirm.invalid")}
          </p>
          <Link className="auth-submit auth-action" to="/app/inbox">
            {t("confirm.enterApp")}
          </Link>
        </div>
      ) : null}
      {step === "limited" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            {t("confirm.limited")}
          </p>
          <button type="button" className="auth-submit" onClick={retry}>
            {t("confirm.retry")}
          </button>
        </div>
      ) : null}
      {step === "error" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            {t("confirm.failed")}
          </p>
        </div>
      ) : null}
    </AuthLayout>
  );
}
