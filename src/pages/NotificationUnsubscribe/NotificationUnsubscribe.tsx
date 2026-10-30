import { useTranslation } from "react-i18next";
import { useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import type { UnsubscribeScope } from "../../api/types";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { BellIcon, CheckIcon } from "../../components/icons/UiIcons";
import { unsubscribeNotifications } from "../../data/notifications";
import { readUnsubscribeLink } from "./unsubscribeLink";
import "./NotificationUnsubscribe.css";

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
  const { t } = useTranslation("auth");
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
          {t("unsubscribe.done")}
        </p>
        <Link className="btn btn-secondary" to={SETTINGS_PATH}>
          {t("unsubscribe.goToSettings")}
        </Link>
      </div>
    );
  }

  return (
    <div className="unsubscribe-body">
      <p className="auth-subtitle">{t(`unsubscribe.scope.${scope}`)}</p>
      {status === "failed" ? (
        <div className="auth-error" role="alert">
          {t("unsubscribe.failed")}
        </div>
      ) : null}
      <button type="button" className="auth-submit" disabled={status === "sending"} onClick={() => void confirm()}>
        {status === "sending" ? t("unsubscribe.submitting") : t("unsubscribe.submit")}
      </button>
      <p className="auth-footer">{t("unsubscribe.inApp")}</p>
    </div>
  );
}

export function NotificationUnsubscribe() {
  const { t } = useTranslation("auth");
  const hydrated = useHydrated();
  const { search } = useLocation();
  const link = hydrated ? readUnsubscribeLink(search) : null;

  return (
    <AuthLayout>
      <h1 className="auth-title">{t("unsubscribe.title")}</h1>
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
            title={t("unsubscribe.missingTitle")}
            hint={t("unsubscribe.missingHint")}
            action={
              <Link className="btn btn-secondary" to={SETTINGS_PATH}>
                {t("unsubscribe.goToSettings")}
              </Link>
            }
          />
        </div>
      )}
    </AuthLayout>
  );
}
