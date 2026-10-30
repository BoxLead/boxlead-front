import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { useAuth } from "../../context/auth";
import { DELETE_ACCOUNT_PATH, keepReauthToken, REAUTH_INTENT } from "../../data/reauth";
import { readAcceptedLegal } from "../../util/legalAcceptance";
import { safeAppPath } from "../../util/redirect";
import "./SocialCallback.css";


function failureMessage(error: unknown): string {
  const code = error instanceof Error && "error" in error ? error.error : null;
  return code === "access_denied" ? i18next.t("socialCallback.cancelled", { ns: "auth" }) : i18next.t("socialCallback.failed", { ns: "auth" });
}

export function SocialCallback() {
  const { t } = useTranslation("auth");
  const { handleRedirectCallback, getIdTokenClaims, logout: clearProviderSession } = useAuth0();
  const { socialLogin, error: sessionError } = useAuth();
  const navigate = useNavigate();
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
          setFailure(i18next.t("socialCallback.failed", { ns: "auth" }));
          return;
        }
        if (appState?.intent === REAUTH_INTENT) {
          keepReauthToken(claims.__raw);
          navigate(DELETE_ACCOUNT_PATH, { replace: true });
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
  }, [handleRedirectCallback, getIdTokenClaims, clearProviderSession, socialLogin, navigate]);

  const message = failure ?? sessionError;

  if (message) {
    return (
      <AuthLayout>
        <h1 className="auth-title">{t("socialCallback.failedTitle")}</h1>
        <p className="auth-error social-callback-msg" role="alert">
          {message}
        </p>
        <Link to="/login" className="btn btn-primary social-callback-btn">
          {t("socialCallback.backToLogin")}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">{t("socialCallback.title")}</h1>
      <p className="auth-subtitle">{t("socialCallback.subtitle")}</p>
      <div className="social-callback-spinner" role="status">
        <span className="spinner" />
        <span className="visually-hidden">{t("socialCallback.loading")}</span>
      </div>
    </AuthLayout>
  );
}
