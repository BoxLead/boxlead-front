import i18next from "i18next";
import { Trans, useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import type { Invitation as InvitationPreview } from "../../api/types";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { longDate } from "../../components/PlanBanner/planNotice";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/auth";
import { acceptInvitation, previewInvitation } from "../../data/billing";
import { acceptInvitationError, invitationInvalidMessage, readInvitationToken } from "../../util/invitation";
import "./Invitation.css";

type PreviewState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "error"; message: string }
  | { status: "ready"; invitation: InvitationPreview };

function previewError(error: unknown): PreviewState {
  if (error instanceof ApiError && (error.status === 410 || error.status === 404 || error.status === 400)) {
    return { status: "invalid" };
  }
  if (error instanceof ApiError && error.status === 429) return { status: "error", message: error.message };
  return { status: "error", message: i18next.t("invitation.checkConnection", { ns: "auth" }) };
}

export function Invitation() {
  const { t } = useTranslation("auth");
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [token] = useState(() => readInvitationToken(window.location.hash));
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<PreviewState>(() => (token ? { status: "loading" } : { status: "invalid" }));
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.location.hash) return;
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${search}`);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    previewInvitation(token).then(
      (invitation) => {
        if (!cancelled) setPreview({ status: "ready", invitation });
      },
      (error: unknown) => {
        if (!cancelled) setPreview(previewError(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  function retry() {
    setPreview({ status: "loading" });
    setAttempt((current) => current + 1);
  }

  async function accept(invitedEmail: string) {
    setAccepting(true);
    setAcceptError(null);
    try {
      await acceptInvitation();
      await refreshUser().catch(() => undefined);
      toast({ message: t("invitation.accepted") });
      navigate("/app/inbox", { replace: true });
    } catch (error) {
      setAcceptError(acceptInvitationError(error, invitedEmail));
      setAccepting(false);
    }
  }

  if (preview.status === "loading") {
    return (
      <AuthLayout>
        <h1 className="auth-title">{t("invitation.loadingTitle")}</h1>
        <p className="auth-subtitle">{t("invitation.loading")}</p>
        <div className="invitation-loading" aria-hidden="true">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </AuthLayout>
    );
  }

  if (preview.status === "invalid") {
    return (
      <AuthLayout>
        <h1 className="auth-title">{t("invitation.invalidTitle")}</h1>
        <p className="auth-subtitle">{invitationInvalidMessage()}</p>
        <Link className="auth-submit invitation-action" to={user ? "/app/inbox" : "/"}>
          {user ? t("invitation.goToApp") : t("invitation.goHome")}
        </Link>
      </AuthLayout>
    );
  }

  if (preview.status === "error") {
    return (
      <AuthLayout>
        <h1 className="auth-title">{t("invitation.errorTitle")}</h1>
        <div className="invitation-body">
          <div className="auth-error" role="alert">
            {preview.message}
          </div>
          <button type="button" className="auth-submit invitation-action" onClick={retry}>
            {t("invitation.retry")}
          </button>
        </div>
      </AuthLayout>
    );
  }

  const { invitation } = preview;
  const expires = longDate(invitation.expiresAt);

  return (
    <AuthLayout>
      <h1 className="auth-title">{t("invitation.title")}</h1>
      <p className="auth-subtitle">
        <Trans
          t={t}
          i18nKey={expires ? "invitation.forEmailUntil" : "invitation.forEmail"}
          values={{ email: invitation.email, date: expires }}
          components={{ email: <strong className="invitation-email" /> }}
        />
      </p>
      {user ? (
        <div className="invitation-body">
          <p className="invitation-session">
            <Trans t={t} i18nKey="invitation.signedInAs" values={{ email: user.email }} components={{ email: <strong className="invitation-email" /> }} />
          </p>
          {acceptError ? (
            <div className="auth-error" role="alert">
              {acceptError}
            </div>
          ) : null}
          <button
            type="button"
            className="auth-submit invitation-action"
            disabled={accepting}
            onClick={() => void accept(invitation.email)}
          >
            {accepting ? t("invitation.accepting") : t("invitation.accept")}
          </button>
          <p className="auth-footer">
            {t("invitation.otherAccount")}{" "}
            <button type="button" className="invitation-link" onClick={logout}>
              {t("invitation.switchAccount")}
            </button>
          </p>
        </div>
      ) : (
        <div className="invitation-body">
          <Link className="auth-submit invitation-action" to="/register?plan=DEMO">
            {t("invitation.createAccount")}
          </Link>
          <p className="auth-footer">
            {t("invitation.haveAccount")} <Link to="/login">{t("invitation.signIn")}</Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
