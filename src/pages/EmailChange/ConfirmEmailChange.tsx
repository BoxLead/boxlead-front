import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isInvalidLink, takeFragmentToken } from "../../util/fragmentToken";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Loading } from "../../components/Loading";
import { confirmEmailChange } from "../../data/account";

type Step = "checking" | "done" | "invalid" | "error";

export function ConfirmEmailChange() {
  const [step, setStep] = useState<Step>("checking");
  const taken = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (taken.current === undefined) taken.current = takeFragmentToken();
    const token = taken.current;
    if (!token) {
      queueMicrotask(() => setStep("invalid"));
      return;
    }
    confirmEmailChange(token).then(
      () => setStep("done"),
      (error: unknown) => setStep(isInvalidLink(error) ? "invalid" : "error"),
    );
  }, []);

  return (
    <AuthLayout>
      <h1 className="auth-title">Confirmar el email nuevo</h1>
      {step === "checking" ? <Loading inline /> : null}
      {step === "done" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="status">
            Listo, tu cuenta ahora usa el email nuevo. Desde ahora entrás con ese email.
          </p>
          <Link className="auth-submit auth-action" to="/app/inbox">
            Ir a BoxLead
          </Link>
        </div>
      ) : null}
      {step === "invalid" ? (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            Este link no sirve. Puede que haya vencido, que ya lo hayas usado, que hayas pedido otro después o que ese
            email ya esté en otra cuenta. Podés pedir el cambio de nuevo desde tu cuenta.
          </p>
          <Link className="auth-submit auth-action" to="/app/inbox">
            Entrar a BoxLead
          </Link>
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
