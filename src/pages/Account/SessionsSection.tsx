import i18next from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { revokeAllSessions } from "../../data/account";
import { clearQueryCache } from "../../data/queryCache";
import { loginPathFor } from "../../util/redirect";
import { AccountRow } from "./AccountRow";

export function SessionsSection() {
  const { t } = useTranslation("account");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      await revokeAllSessions();
      clearQueryCache();
      window.location.assign(loginPathFor("/app/inbox"));
    } catch {
      setBusy(false);
      setConfirming(false);
      setError(t("sessions.failed"));
    }
  }

  return (
    <AccountRow
      title={t("sessions.title")}
      description={t("sessions.description")}
      action={
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
          {t("sessions.action")}
        </button>
      }
    >
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        cancelLabel={i18next.t("ui.cancel", { ns: "shell" })}
        open={confirming}
        title={t("sessions.confirmTitle")}
        confirmLabel={t("sessions.confirm")}
        busy={busy}
        onConfirm={() => void revoke()}
        onCancel={() => setConfirming(false)}
      >
        {t("sessions.confirmText")}
      </ConfirmDialog>
    </AccountRow>
  );
}
