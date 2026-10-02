import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type {
  AccountConnectionResponse,
  OAuthCallbackRequest,
  PlatformType,
} from "../../api/types";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { platformLabel } from "../../util/labels";
import { consumeOAuthSession, redirectUriFor } from "../../util/oauth";
import "./OAuthCallback.css";

const ALLOWED: PlatformType[] = ["META", "INSTAGRAM", "WHATSAPP", "MELI"];
const CONNECTIONS_PATH = "/app/connections";
const REDIRECT_DELAY_MS = 2000;

function isPlatform(p: string | undefined): p is PlatformType {
  return p !== undefined && (ALLOWED as string[]).includes(p);
}

type Outcome =
  | { status: "ok"; accounts: AccountConnectionResponse[] }
  | { status: "error"; message: string };

export function OAuthCallback() {
  useDocumentTitle("Conectando cuenta");

  const { platform: platformParam } = useParams<{ platform: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [session] = useState(() =>
    consumeOAuthSession(searchParams.get("state")),
  );

  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthDesc = searchParams.get("error_description");

  const blockingError = useMemo(() => {
    if (!isPlatform(platformParam)) {
      return "La plataforma de este enlace no es válida.";
    }
    if (oauthError) {
      return oauthDesc?.replace(/\+/g, " ") || oauthError;
    }
    if (!code) {
      return "Falta el código de autorización. Probá conectar de nuevo.";
    }
    if (!session.valid) {
      return "No pudimos verificar que esta conexión se inició desde tu cuenta. Probá conectar de nuevo.";
    }
    return null;
  }, [platformParam, oauthError, oauthDesc, code, session.valid]);

  const platform = platformParam as PlatformType;

  useEffect(() => {
    if (blockingError || !code) return;

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const body: OAuthCallbackRequest = {
      code,
      redirectUri: redirectUriFor(platform),
      codeVerifier: session.codeVerifier,
    };

    api
      .post<AccountConnectionResponse[]>(`/oauth/${platform}/callback`, body)
      .then(
        (accounts) => {
          if (cancelled) return;
          setOutcome({ status: "ok", accounts });
          redirectTimer = setTimeout(() => {
            navigate(CONNECTIONS_PATH, { replace: true });
          }, REDIRECT_DELAY_MS);
        },
        (e: unknown) => {
          if (cancelled) return;
          setOutcome({
            status: "error",
            message:
              e instanceof ApiError
                ? e.message
                : "No pudimos completar la conexión.",
          });
        },
      );

    return () => {
      cancelled = true;
      if (redirectTimer !== undefined) clearTimeout(redirectTimer);
    };
  }, [blockingError, code, platform, navigate, session.codeVerifier]);

  const errorMessage =
    blockingError ?? (outcome?.status === "error" ? outcome.message : null);

  if (errorMessage) {
    return (
      <AuthLayout>
        <h1 className="auth-title">No pudimos conectar</h1>
        <p className="auth-error oauth-callback-msg" role="alert">
          {errorMessage}
        </p>
        <Link
          to={CONNECTIONS_PATH}
          className="btn btn-primary oauth-callback-btn"
        >
          Volver a conexiones
        </Link>
      </AuthLayout>
    );
  }

  if (outcome?.status === "ok") {
    return (
      <AuthLayout>
        <h1 className="auth-title">Cuenta conectada</h1>
        <p className="auth-subtitle">
          {outcome.accounts.length === 0
            ? "La conexión se completó, pero no recibimos cuentas. Revisá los permisos de la app."
            : "Te llevamos a tus conexiones…"}
        </p>
        {outcome.accounts.length > 0 ? (
          <ul className="oauth-callback-list">
            {outcome.accounts.map((account) => (
              <li key={account.id}>
                <strong>{platformLabel(account.platform)}</strong> ·{" "}
                {account.displayName ?? account.externalAccountId}
              </li>
            ))}
          </ul>
        ) : null}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Conectando tu cuenta</h1>
      <p className="auth-subtitle">Esto tarda unos segundos.</p>
      <div className="oauth-callback-spinner" role="status">
        <span className="spinner" />
        <span className="visually-hidden">Conectando…</span>
      </div>
    </AuthLayout>
  );
}
