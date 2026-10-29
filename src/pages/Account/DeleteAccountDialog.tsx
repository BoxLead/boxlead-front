import { type FormEvent, useId, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { AccountView, SignInProvider } from "../../api/types";
import { Dialog } from "../../components/ui/Dialog";
import { deleteAccount } from "../../data/account";
import { clearQueryCache } from "../../data/queryCache";
import { clearReauthToken, peekReauthToken, REAUTH_PATH } from "../../data/reauth";
import { SUPPORT_EMAIL } from "../../util/company";
import { SOCIAL_PROVIDERS } from "../../util/social";

export const CONFIRMATION_WORD = "BORRAR";

const PROVIDER_IDS: Partial<Record<SignInProvider, string>> = { GOOGLE: "google", FACEBOOK: "facebook" };

type Failure = { message: string; billing?: boolean };

function failureOf(error: unknown): Failure {
  const code = apiErrorCode(error);
  if (code === "WRONG_PASSWORD") return { message: "La contraseña no es correcta." };
  if (code === "REAUTHENTICATION_REQUIRED") {
    return { message: "Tenés que volver a entrar con tu proveedor justo antes de borrar la cuenta." };
  }
  if (code === "CONFIRMATION_MISMATCH") return { message: `Escribí ${CONFIRMATION_WORD} en mayúsculas.` };
  if (code === "SUBSCRIPTION_OPEN") {
    return { message: "Primero cancelá tu suscripción. Después vas a poder borrar la cuenta.", billing: true };
  }
  if (code === "RESELLER_ACTIVE" || code === "ADMIN_ACTIVE") {
    return { message: `Esta cuenta se cierra a mano. Escribinos a ${SUPPORT_EMAIL} desde el email de la cuenta.` };
  }
  if (error instanceof ApiError && error.status === 429) return { message: error.message };
  return { message: "No pudimos borrar la cuenta. Probá de nuevo." };
}

export function DeleteAccountDialog({ account, onClose }: { account: AccountView; onClose: () => void }) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const reauthToken = account.hasPassword ? null : peekReauthToken();
  const providers = SOCIAL_PROVIDERS.filter((provider) =>
    account.providers.some((item) => PROVIDER_IDS[item] === provider.id),
  );
  const proven = account.hasPassword ? password !== "" : reauthToken !== null;
  const ready = proven && confirmation.trim() === CONFIRMATION_WORD;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      await deleteAccount(
        account.hasPassword
          ? { password, confirmation: confirmation.trim() }
          : { idToken: reauthToken ?? "", confirmation: confirmation.trim() },
      );
      clearReauthToken();
      clearQueryCache();
      window.location.assign("/");
    } catch (error) {
      if (apiErrorCode(error) === "REAUTHENTICATION_REQUIRED") clearReauthToken();
      setFailure(failureOf(error));
      setBusy(false);
    }
  }

  function close() {
    clearReauthToken();
    onClose();
  }

  return (
    <Dialog open title="¿Borrar tu cuenta?" busy={busy} onClose={close}>
      <form className="account-form" onSubmit={submit}>
        <ul className="account-delete-list">
          <li>Borramos tus conexiones con Meta, WhatsApp y Mercado Libre.</li>
          <li>Borramos tus leads, conversaciones, categorías y agentes.</li>
          <li>Guardamos facturas, pagos y aceptaciones de términos porque la ley nos lo pide.</li>
          <li>No se puede deshacer.</li>
        </ul>
        {account.hasPassword ? (
          <div className="field">
            <label className="field-label" htmlFor={`${id}-password`}>
              Tu contraseña
            </label>
            <input
              id={`${id}-password`}
              className="input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        ) : reauthToken ? (
          <p className="account-note" role="status">
            Ya confirmaste que sos vos.
          </p>
        ) : (
          <div className="field">
            <span className="field-label">Confirmá que sos vos</span>
            <div className="account-actions account-actions-start">
              {providers.map((provider) => (
                <a key={provider.id} className="btn btn-secondary" href={`${REAUTH_PATH}?proveedor=${provider.id}`}>
                  Entrar con {provider.name}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label className="field-label" htmlFor={`${id}-confirmation`}>
            Escribí {CONFIRMATION_WORD} para confirmar
          </label>
          <input
            id={`${id}-confirmation`}
            className="input"
            name="confirmation"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        {failure ? (
          <p className="form-error" role="alert">
            {failure.message}
            {failure.billing ? (
              <>
                {" "}
                <Link to="/baja">Pedir la baja</Link>
              </>
            ) : null}
          </p>
        ) : null}
        <div className="account-actions">
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-danger" disabled={!ready || busy}>
            {busy ? "Borrando…" : "Borrar mi cuenta"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
