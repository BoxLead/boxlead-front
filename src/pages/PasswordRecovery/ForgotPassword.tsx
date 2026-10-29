import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Loading } from "../../components/Loading";
import { requestPasswordReset } from "../../data/account";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { SUPPORT_EMAIL } from "../../util/company";

export const RECOVERY_SENT_MESSAGE =
  "Si hay una cuenta con ese email, te mandamos un link para elegir una contraseña nueva. Vence en 30 minutos. Si no lo ves, revisá la carpeta de spam.";

export function ForgotPassword() {
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
      else setError("No pudimos mandar el pedido. Revisá tu conexión y probá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Recuperar la contraseña</h1>
      {options === null ? (
        <Loading inline />
      ) : !options.passwordReset ? (
        <div className="auth-stack">
          <p className="auth-notice">
            Por ahora la contraseña no se puede recuperar desde acá. Escribinos a{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> desde el email de tu cuenta y te ayudamos.
          </p>
          <p className="auth-footer">
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </div>
      ) : sent ? (
        <div className="auth-stack">
          <p className="auth-notice" role="status">
            {RECOVERY_SENT_MESSAGE}
          </p>
          <p className="auth-footer">
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="auth-subtitle">Escribí el email de tu cuenta y te mandamos un link para elegir una nueva.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="auth-error" role="alert">
                {error}
              </div>
            ) : null}
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="vos@tuempresa.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="auth-submit" type="submit" disabled={sending}>
              {sending ? "Enviando…" : "Mandar el link"}
            </button>
          </form>
          <p className="auth-footer">
            ¿Te acordaste? <Link to="/login">Iniciar sesión</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
