import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type {
  AccountConnectionResponse,
  OAuthCallbackRequest,
  PlatformType,
} from "../../api/types";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { useToast } from "../../components/ui/toast";
import { invalidateQueries } from "../../data/queryCache";
import { CONNECTIONS_KEY } from "../../hooks/useConnectPlatform";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { CONNECTABLE_PLATFORMS, getPlatform } from "../../platforms";
import { consumeOAuthSession, redirectUriFor } from "../../util/oauth";
import "./OAuthCallback.css";

const CONNECTIONS_PATH = "/app/connections";

function asPlatform(value: string | undefined): PlatformType | null {
  const match = CONNECTABLE_PLATFORMS.find((p) => p.id === value?.toUpperCase());
  return match ? match.id : null;
}

function providerError(code: string, description: string | null, platformName: string): string {
  if (code === "access_denied") {
    return `Cancelaste la autorización en ${platformName}. Podés intentarlo de nuevo cuando quieras.`;
  }
  return description?.replace(/\+/g, " ") || `${platformName} no autorizó la conexión (${code}).`;
}

export function OAuthCallback() {
  const { platform: platformParam } = useParams<{ platform: string }>();
  const platform = asPlatform(platformParam);
  const definition = platform ? getPlatform(platform) : null;
  useDocumentTitle(definition ? `Conectando ${definition.name}` : "Conectando cuenta");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [failure, setFailure] = useState<string | null>(null);
  const [emptyResult, setEmptyResult] = useState(false);
  const [session] = useState(() => consumeOAuthSession(searchParams.get("state")));

  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthDesc = searchParams.get("error_description");

  const blockingError = useMemo(() => {
    if (!definition) return "El enlace de conexión no es válido.";
    if (oauthError) return providerError(oauthError, oauthDesc, definition.name);
    if (!code) return "Falta el código de autorización. Probá conectar de nuevo.";
    if (!session.valid) {
      return "No pudimos verificar que esta conexión se inició desde tu cuenta. Probá conectar de nuevo.";
    }
    return null;
  }, [definition, oauthError, oauthDesc, code, session.valid]);

  useEffect(() => {
    if (blockingError || !code || !platform) return;
    let cancelled = false;
    const body: OAuthCallbackRequest = {
      code,
      redirectUri: redirectUriFor(platform),
      codeVerifier: session.codeVerifier,
    };
    api.post<AccountConnectionResponse[]>(`/oauth/${platform}/callback`, body).then(
      async (accounts) => {
        if (cancelled) return;
        if (accounts.length === 0) {
          setEmptyResult(true);
          return;
        }
        await invalidateQueries(CONNECTIONS_KEY);
        const names = accounts.map((a) => a.displayName ?? a.externalAccountId).join(", ");
        toast({ message: `Conectaste ${getPlatform(platform).name}: ${names}.` });
        navigate(CONNECTIONS_PATH, { replace: true, state: { connected: platform } });
      },
      (e: unknown) => {
        if (cancelled) return;
        setFailure(e instanceof ApiError ? e.message : "No pudimos completar la conexión.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [blockingError, code, platform, navigate, session.codeVerifier, toast]);

  const errorMessage = blockingError ?? failure;
  const logo = definition ? <span className="oauth-callback-logo">{definition.logo(40)}</span> : null;

  if (errorMessage) {
    return (
      <AuthLayout>
        {logo}
        <h1 className="auth-title">No pudimos conectar {definition?.name ?? "la cuenta"}</h1>
        <p className="auth-error oauth-callback-msg" role="alert">
          {errorMessage}
        </p>
        <Link to={CONNECTIONS_PATH} className="btn btn-primary oauth-callback-btn">
          Volver a conexiones
        </Link>
      </AuthLayout>
    );
  }

  if (emptyResult) {
    return (
      <AuthLayout>
        {logo}
        <h1 className="auth-title">No encontramos cuentas</h1>
        <p className="auth-subtitle">
          La autorización se completó pero {definition?.name} no compartió ninguna {definition?.accountNoun}. Revisá
          los permisos y probá de nuevo.
        </p>
        <Link to={CONNECTIONS_PATH} className="btn btn-primary oauth-callback-btn">
          Volver a conexiones
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {logo}
      <h1 className="auth-title">Conectando {definition?.name}</h1>
      <p className="auth-subtitle">Estamos guardando la autorización. Tarda unos segundos.</p>
      <div className="oauth-callback-spinner" role="status">
        <span className="spinner" />
        <span className="visually-hidden">Conectando…</span>
      </div>
    </AuthLayout>
  );
}
