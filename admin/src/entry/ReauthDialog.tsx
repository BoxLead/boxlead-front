import { useId, useState, type FormEvent } from "react";
import { Dialog } from "../../../src/components/ui/Dialog";
import { AdminApiError, errorText } from "../api/errors";
import { useSession } from "../session/session";
import { CodeField } from "./CodeField";
import { isCompleteCode } from "./code";

function ReauthForm() {
  const { reauthenticate, cancelReauthentication } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCompleteCode(code)) {
      setError("El código tiene 6 números.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reauthenticate(code);
    } catch (failure) {
      setError(failure instanceof AdminApiError ? failure.message : errorText(failure));
      setCode("");
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {error ? (
        <p className="form-error" role="alert" id={errorId}>
          {error}
        </p>
      ) : null}
      <CodeField value={code} onChange={setCode} disabled={busy} invalid={Boolean(error)} describedBy={error ? errorId : undefined} autoFocus />
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={cancelReauthentication} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Revisando…" : "Seguir"}
        </button>
      </div>
    </form>
  );
}

export function ReauthDialog() {
  const { reauthenticating, cancelReauthentication } = useSession();
  return (
    <Dialog
      open={reauthenticating}
      size="sm"
      title="Tu sesión de administración venció"
      description="Ingresá el código de tu app de autenticación y seguimos con lo que estabas haciendo."
      onClose={cancelReauthentication}
    >
      {reauthenticating ? <ReauthForm /> : null}
    </Dialog>
  );
}
