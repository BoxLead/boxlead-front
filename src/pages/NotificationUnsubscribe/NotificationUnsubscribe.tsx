import { useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import type { UnsubscribeScope } from "../../api/types";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { BellIcon, CheckIcon } from "../../components/icons/UiIcons";
import { unsubscribeNotifications } from "../../data/notifications";
import { readUnsubscribeLink, SCOPE_TEXT } from "./unsubscribeLink";
import "./NotificationUnsubscribe.css";

const TITLE = "Dejar de recibir avisos";
const SETTINGS_PATH = "/app/notificaciones";

type Status = "idle" | "sending" | "done" | "failed";

const noop = () => () => undefined;

function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

function UnsubscribeForm({ token, scope }: { token: string; scope: UnsubscribeScope }) {
  const [status, setStatus] = useState<Status>("idle");

  async function confirm() {
    setStatus("sending");
    try {
      await unsubscribeNotifications(token, scope);
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  }

  if (status === "done") {
    return (
      <div className="unsubscribe-done" role="status">
        <span className="unsubscribe-done-icon" aria-hidden="true">
          <CheckIcon />
        </span>
        <p>
          Listo, no te vamos a mandar más estos mails. Podés volver a activarlos desde Notificaciones en la app.
        </p>
        <Link className="btn btn-secondary" to={SETTINGS_PATH}>
          Ir a Notificaciones
        </Link>
      </div>
    );
  }

  return (
    <div className="unsubscribe-body">
      <p className="auth-subtitle">{SCOPE_TEXT[scope]}</p>
      {status === "failed" ? (
        <div className="auth-error" role="alert">
          No pudimos darte de baja. Revisá tu conexión y probá de nuevo.
        </div>
      ) : null}
      <button type="button" className="auth-submit" disabled={status === "sending"} onClick={() => void confirm()}>
        {status === "sending" ? "Guardando…" : "Dejar de recibirlos"}
      </button>
      <p className="auth-footer">Los avisos dentro de la app no cambian.</p>
    </div>
  );
}

export function NotificationUnsubscribe() {
  const hydrated = useHydrated();
  const { search } = useLocation();
  const link = hydrated ? readUnsubscribeLink(search) : null;

  return (
    <AuthLayout>
      <h1 className="auth-title">{TITLE}</h1>
      {!hydrated ? (
        <div className="unsubscribe-loading" aria-hidden="true">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : link ? (
        <UnsubscribeForm token={link.token} scope={link.scope} key={`${link.token}:${link.scope}`} />
      ) : (
        <div className="unsubscribe-missing">
          <EmptyState
            icon={<BellIcon />}
            title="A este enlace le falta una parte"
            hint="Abrí de nuevo el enlace para dejar de recibir mails desde el último aviso que te llegó. También podés elegir tus avisos desde Notificaciones en la app."
            action={
              <Link className="btn btn-secondary" to={SETTINGS_PATH}>
                Ir a Notificaciones
              </Link>
            }
          />
        </div>
      )}
    </AuthLayout>
  );
}
