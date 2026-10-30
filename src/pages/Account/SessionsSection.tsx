import i18next from "i18next";
import { useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { revokeAllSessions } from "../../data/account";
import { clearQueryCache } from "../../data/queryCache";
import { loginPathFor } from "../../util/redirect";
import { AccountRow } from "./AccountRow";

export function SessionsSection() {
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
      setError("No pudimos cerrar las sesiones. Probá de nuevo.");
    }
  }

  return (
    <AccountRow
      title="Sesiones"
      description="Cerrá la sesión en todos los dispositivos donde entraste, este incluido. Vas a tener que volver a entrar."
      action={
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
          Cerrar sesión en todos los dispositivos
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
        title="¿Cerrar sesión en todos los dispositivos?"
        confirmLabel="Cerrar todas"
        busy={busy}
        onConfirm={() => void revoke()}
        onCancel={() => setConfirming(false)}
      >
        Vas a salir de BoxLead en todos lados, también acá.
      </ConfirmDialog>
    </AccountRow>
  );
}
