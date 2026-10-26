import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { useAuth } from "../../context/auth";
import { readAcceptedLegal } from "../../util/legalAcceptance";
import { safeAppPath } from "../../util/redirect";
import "./SocialCallback.css";

const FAILURE_MESSAGE = "No pudimos iniciar sesión con tu cuenta. Probá de nuevo.";
const CANCELLED_MESSAGE = "Cancelaste el inicio de sesión. Podés intentarlo de nuevo cuando quieras.";

function failureMessage(error: unknown): string {
  const code = error instanceof Error && "error" in error ? error.error : null;
  return code === "access_denied" ? CANCELLED_MESSAGE : FAILURE_MESSAGE;
}

export function SocialCallback() {
  const { handleRedirectCallback, getIdTokenClaims, logout: clearProviderSession } = useAuth0();
  const { socialLogin, error: sessionError } = useAuth();
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function complete() {
      try {
        const { appState } = await handleRedirectCallback();
        const claims = await getIdTokenClaims();
        void clearProviderSession({ openUrl: false });
        if (!claims?.__raw) {
          setFailure(FAILURE_MESSAGE);
          return;
        }
        await socialLogin(
          claims.__raw,
          safeAppPath(appState?.next) ?? undefined,
          readAcceptedLegal(appState?.acceptedLegal),
        );
      } catch (e: unknown) {
        setFailure(failureMessage(e));
      }
    }

    void complete();
  }, [handleRedirectCallback, getIdTokenClaims, clearProviderSession, socialLogin]);

  const message = failure ?? sessionError;

  if (message) {
    return (
      <AuthLayout>
        <h1 className="auth-title">No pudimos iniciar sesión</h1>
        <p className="auth-error social-callback-msg" role="alert">
          {message}
        </p>
        <Link to="/login" className="btn btn-primary social-callback-btn">
          Volver a iniciar sesión
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Iniciando sesión</h1>
      <p className="auth-subtitle">Estamos verificando tu cuenta. Tarda unos segundos.</p>
      <div className="social-callback-spinner" role="status">
        <span className="spinner" />
        <span className="visually-hidden">Iniciando sesión…</span>
      </div>
    </AuthLayout>
  );
}
