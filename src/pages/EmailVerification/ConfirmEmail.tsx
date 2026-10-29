import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isInvalidLink, isRateLimited, takeFragmentToken } from "../../util/fragmentToken";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Loading } from "../../components/Loading";
import { verifyEmail } from "../../data/account";

type Step = "checking" | "done" | "invalid" | "limited" | "error";

export function ConfirmEmail() {
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
      <h1 className="auth-title">Confirmar tu email</h1>
      {step === "checking" ? <Loading inline /> : null}
      {step === "done" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="status">
            Listo, confirmaste tu email.
          </p>
          <Link className="auth-submit auth-action" to="/app/inbox">
            Ir a BoxLead
          </Link>
        </div>
      ) : null}
      {step === "invalid" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            Este link no sirve. Puede que haya vencido, que ya lo hayas usado o que hayas pedido otro después. Entrá a
            BoxLead para pedir uno nuevo.
          </p>
          <Link className="auth-submit auth-action" to="/app/inbox">
            Entrar a BoxLead
          </Link>
        </div>
      ) : null}
      {step === "limited" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            Hiciste demasiados intentos seguidos. Esperá unos minutos y probá de nuevo, el link sigue sirviendo.
          </p>
          <button type="button" className="auth-submit" onClick={retry}>
            Probar de nuevo
          </button>
        </div>
      ) : null}
      {step === "error" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            No pudimos confirmar tu email. Revisá tu conexión y abrí el link de nuevo.
          </p>
        </div>
      ) : null}
    </AuthLayout>
  );
}
