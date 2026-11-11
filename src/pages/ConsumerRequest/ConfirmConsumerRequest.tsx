import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ConsumerRequestConfirmation } from "../../api/types";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Loading } from "../../components/Loading";
import { takeFragmentToken } from "../../util/fragmentToken";
import { confirmConsumerRequest, isInvalidConfirmation, isRateLimited } from "./consumerRequest";

type Step =
  | { state: "checking" }
  | { state: "done"; confirmation: ConsumerRequestConfirmation }
  | { state: "invalid" }
  | { state: "limited" }
  | { state: "error" };

export function ConfirmConsumerRequest() {
  const { t } = useTranslation("consumer");
  const [step, setStep] = useState<Step>({ state: "checking" });
  const taken = useRef<string | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (taken.current === undefined) taken.current = takeFragmentToken();
    const token = taken.current;
    if (!token) {
      queueMicrotask(() => setStep({ state: "invalid" }));
      return;
    }
    confirmConsumerRequest(token).then(
      (confirmation) => setStep({ state: "done", confirmation }),
      (error: unknown) =>
        setStep({ state: isInvalidConfirmation(error) ? "invalid" : isRateLimited(error) ? "limited" : "error" }),
    );
  }, [attempt]);

  function retry() {
    setStep({ state: "checking" });
    setAttempt((current) => current + 1);
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">{t("confirm.title")}</h1>
      {step.state === "checking" ? <Loading inline /> : null}
      {step.state === "done" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="status">
            {t("confirm.done", { code: step.confirmation.code })}
          </p>
        </div>
      ) : null}
      {step.state === "invalid" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            {t("confirm.invalid")}
          </p>
          <p className="auth-footer">
            <Link to="/arrepentimiento">{t("titles.WITHDRAWAL")}</Link>
          </p>
          <p className="auth-footer">
            <Link to="/baja">{t("titles.CANCELLATION")}</Link>
          </p>
        </div>
      ) : null}
      {step.state === "limited" || step.state === "error" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            {step.state === "limited" ? t("confirm.limited") : t("confirm.failed")}
          </p>
          <button type="button" className="auth-submit" onClick={retry}>
            {t("confirm.retry")}
          </button>
        </div>
      ) : null}
    </AuthLayout>
  );
}
