import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { PasswordField } from "../../components/AuthLayout/PasswordField";
import { Loading } from "../../components/Loading";
import { resetPassword } from "../../data/account";
import { takeFragmentToken } from "../../util/fragmentToken";
import "./PasswordRecovery.css";

const MIN_PASSWORD_LENGTH = 8;

type Step = "reading" | "form" | "invalid" | "done";

function resetError(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return error.message;
  if (error instanceof ApiError && error.status === 400) {
    return `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return "No pudimos guardar la contraseña. Revisá tu conexión y probá de nuevo.";
}

export function ResetPassword() {
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
      if (apiErrorCode(failure) === "INVALID_TOKEN") setStep("invalid");
      else setError(resetError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Elegí una contraseña nueva</h1>
      {step === "reading" ? <Loading inline /> : null}
      {step === "invalid" ? (
        <div className="recovery-body">
          <p className="recovery-notice" role="alert">
            Este link no sirve. Puede que haya vencido, que ya lo hayas usado o que hayas pedido otro después.
          </p>
          <p className="auth-footer">
            <Link to="/recuperar-clave">Pedir un link nuevo</Link>
          </p>
        </div>
      ) : null}
      {step === "done" ? (
        <div className="recovery-body">
          <p className="recovery-notice" role="status">
            Listo, guardamos tu contraseña nueva y cerramos las sesiones abiertas en otros dispositivos.
          </p>
          <Link className="auth-submit recovery-action" to="/login">
            Iniciar sesión
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
            hint={`Al menos ${MIN_PASSWORD_LENGTH} caracteres.`}
            value={password}
            onChange={setPassword}
          />
          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar la contraseña"}
          </button>
        </form>
      ) : null}
    </AuthLayout>
  );
}
