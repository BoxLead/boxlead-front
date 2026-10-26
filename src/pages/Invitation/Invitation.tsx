import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import type { Invitation as InvitationPreview } from "../../api/types";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { longDate } from "../../components/PlanBanner/planNotice";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/auth";
import { acceptInvitation, previewInvitation } from "../../data/billing";
import { acceptInvitationError, INVITATION_INVALID_MESSAGE, readInvitationToken } from "../../util/invitation";
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
  return { status: "error", message: "Revisá tu conexión y probá de nuevo." };
}

export function Invitation() {
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
      toast({ message: "Activaste la Beta." });
      navigate("/app/inbox", { replace: true });
    } catch (error) {
      setAcceptError(acceptInvitationError(error, invitedEmail));
      setAccepting(false);
    }
  }

  if (preview.status === "loading") {
    return (
      <AuthLayout>
        <h1 className="auth-title">Invitación a la Beta</h1>
        <p className="auth-subtitle">Estamos revisando tu invitación.</p>
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
        <h1 className="auth-title">Esta invitación no sirve</h1>
        <p className="auth-subtitle">{INVITATION_INVALID_MESSAGE}</p>
        <Link className="auth-submit invitation-action" to={user ? "/app/inbox" : "/"}>
          {user ? "Ir a BoxLead" : "Ir al inicio"}
        </Link>
      </AuthLayout>
    );
  }

  if (preview.status === "error") {
    return (
      <AuthLayout>
        <h1 className="auth-title">No pudimos revisar tu invitación</h1>
        <div className="invitation-body">
          <div className="auth-error" role="alert">
            {preview.message}
          </div>
          <button type="button" className="auth-submit invitation-action" onClick={retry}>
            Reintentar
          </button>
        </div>
      </AuthLayout>
    );
  }

  const { invitation } = preview;
  const expires = longDate(invitation.expiresAt);

  return (
    <AuthLayout>
      <h1 className="auth-title">Te invitaron a la Beta de BoxLead</h1>
      <p className="auth-subtitle">
        La invitación es para <strong className="invitation-email">{invitation.email}</strong>
        {expires ? ` y vale hasta el ${expires}.` : "."}
      </p>
      {user ? (
        <div className="invitation-body">
          <p className="invitation-session">
            Entraste como <strong className="invitation-email">{user.email}</strong>.
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
            {accepting ? "Activando…" : "Activar la Beta en esta cuenta"}
          </button>
          <p className="auth-footer">
            ¿Es otra cuenta?{" "}
            <button type="button" className="invitation-link" onClick={logout}>
              Entrar con otro email
            </button>
          </p>
        </div>
      ) : (
        <div className="invitation-body">
          <Link className="auth-submit invitation-action" to="/register?plan=DEMO">
            Crear mi cuenta
          </Link>
          <p className="auth-footer">
            ¿Ya tenés cuenta con ese email? <Link to="/login">Iniciar sesión</Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
