import i18next from "i18next";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
    return i18next.t("callback.cancelled", { ns: "connections", name: platformName });
  }
  return description?.replace(/\+/g, " ") || i18next.t("callback.denied", { ns: "connections", name: platformName, code });
}

export function OAuthCallback() {
  const { platform: platformParam } = useParams<{ platform: string }>();
  const platform = asPlatform(platformParam);
  const definition = platform ? getPlatform(platform) : null;
  const { t } = useTranslation("connections");
  useDocumentTitle(definition ? t("callback.title", { name: definition.name }) : t("callback.titleFallback"));

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
    if (!definition) return t("callback.invalidLink");
    if (oauthError) return providerError(oauthError, oauthDesc, definition.name);
    if (!code) return t("callback.missingCode");
    if (!session.valid) return t("callback.unverified");
    return null;
  }, [definition, oauthError, oauthDesc, code, session.valid, t]);

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
        toast({ message: i18next.t("callback.connected", { ns: "connections", name: getPlatform(platform).name, accounts: names }) });
        navigate(CONNECTIONS_PATH, { replace: true, state: { connected: platform } });
      },
      (e: unknown) => {
        if (cancelled) return;
        setFailure(e instanceof ApiError ? e.message : i18next.t("callback.failed", { ns: "connections" }));
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
        <h1 className="auth-title">{t("callback.errorTitle", { name: definition?.name ?? t("callback.errorFallbackName") })}</h1>
        <p className="auth-error oauth-callback-msg" role="alert">
          {errorMessage}
        </p>
        <Link to={CONNECTIONS_PATH} className="btn btn-primary oauth-callback-btn">
          {t("callback.back")}
        </Link>
      </AuthLayout>
    );
  }

  if (emptyResult) {
    return (
      <AuthLayout>
        {logo}
        <h1 className="auth-title">{t("callback.emptyTitle")}</h1>
        <p className="auth-subtitle">
          {t("callback.emptyBody", { name: definition?.name ?? "", accountNoun: definition?.accountNoun ?? "" })}
        </p>
        <Link to={CONNECTIONS_PATH} className="btn btn-primary oauth-callback-btn">
          {t("callback.back")}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {logo}
      <h1 className="auth-title">{t("callback.title", { name: definition?.name ?? "" })}</h1>
      <p className="auth-subtitle">{t("callback.saving")}</p>
      <div className="oauth-callback-spinner" role="status">
        <span className="spinner" />
        <span className="visually-hidden">{t("callback.connecting")}</span>
      </div>
    </AuthLayout>
  );
}
