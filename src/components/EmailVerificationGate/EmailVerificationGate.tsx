import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/auth";
import { resendEmailVerification } from "../../data/account";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import "./EmailVerificationGate.css";

type Resend = { status: "idle" | "sending" | "sent" } | { status: "error"; message: string };

export function EmailVerificationGate() {
  const { user, logout, refreshUser } = useAuth();
  const [resend, setResend] = useState<Resend>({ status: "idle" });
  const [checking, setChecking] = useState(false);
  useDocumentTitle("Confirmá tu email");

  async function sendAgain() {
    setResend({ status: "sending" });
    try {
      await resendEmailVerification();
      setResend({ status: "sent" });
    } catch (error) {
      setResend({
        status: "error",
        message:
          error instanceof ApiError && error.status === 429
            ? error.message
            : "No pudimos mandar el link. Probá de nuevo en un rato.",
      });
    }
  }

  async function checkAgain() {
    setChecking(true);
    await refreshUser().catch(() => undefined);
    setChecking(false);
  }

  return (
    <section className="page email-gate" aria-labelledby="email-gate-title">
      <div className="panel email-gate-panel">
        <h1 id="email-gate-title" className="page-title">
          Confirmá tu email
        </h1>
        <p className="email-gate-text">
          Te mandamos un link a <strong className="email-gate-email">{user?.email}</strong>. Abrilo para empezar a usar
          BoxLead. El link vence en 2 horas.
        </p>
        {resend.status === "sent" ? (
          <p className="email-gate-text" role="status">
            Te mandamos un link nuevo. Si no llega en unos minutos, revisá la carpeta de spam.
          </p>
        ) : null}
        {resend.status === "error" ? (
          <p className="form-error" role="alert">
            {resend.message}
          </p>
        ) : null}
        <div className="email-gate-actions">
          <button type="button" className="btn btn-primary" onClick={checkAgain} disabled={checking}>
            {checking ? "Revisando…" : "Ya lo confirmé"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={sendAgain}
            disabled={resend.status === "sending"}
          >
            {resend.status === "sending" ? "Enviando…" : "Mandar el link de nuevo"}
          </button>
        </div>
        <p className="email-gate-footer">
          {user?.account?.settings ? (
            <>
              ¿Escribiste mal el email? <Link to="/app/cuenta">Corregilo desde tu cuenta</Link>.{" "}
            </>
          ) : null}
          <button type="button" className="email-gate-logout" onClick={logout}>
            Cerrar sesión
          </button>
        </p>
      </div>
    </section>
  );
}
