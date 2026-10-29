import { useId, useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { revokeAllSessions } from "../../data/account";
import { clearQueryCache } from "../../data/queryCache";
import { loginPathFor } from "../../util/redirect";

export function SessionsSection() {
  const id = useId();
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
    <section className="panel account-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="panel-title">
        Sesiones
      </h2>
      <p className="account-note">
        Cerrá la sesión en todos los dispositivos donde entraste, este incluido. Vas a tener que volver a entrar.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="account-actions">
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
          Cerrar sesión en todos los dispositivos
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="¿Cerrar sesión en todos los dispositivos?"
        confirmLabel="Cerrar todas"
        busy={busy}
        onConfirm={() => void revoke()}
        onCancel={() => setConfirming(false)}
      >
        Vas a salir de BoxLead en todos lados, también acá.
      </ConfirmDialog>
    </section>
  );
}
