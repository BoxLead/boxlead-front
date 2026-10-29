import { type FormEvent, useId, useState } from "react";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { AccountView } from "../../api/types";
import { ACCOUNT_KEY, changeEmail } from "../../data/account";
import { invalidateQueries } from "../../data/queryCache";

function emailError(error: unknown): string {
  const code = apiErrorCode(error);
  if (code === "WRONG_PASSWORD") return "La contraseña no es correcta.";
  if (code === "SAME_EMAIL") return "Ese ya es el email de tu cuenta.";
  if (error instanceof ApiError && error.status === 429) return error.message;
  if (error instanceof ApiError && error.status === 400) return "Revisá el email nuevo.";
  return "No pudimos pedir el cambio. Probá de nuevo.";
}

export function EmailSection({ account }: { account: AccountView }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await changeEmail(password, newEmail.trim());
      setRequested(newEmail.trim());
      setEditing(false);
      setPassword("");
      setNewEmail("");
      void invalidateQueries(ACCOUNT_KEY);
    } catch (failure) {
      setError(emailError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel account-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="panel-title">
        Email
      </h2>
      <p className="account-value">
        <span className="account-email">{account.email}</span>{" "}
        <span className={account.emailVerified ? "account-badge account-badge-ok" : "account-badge"}>
          {account.emailVerified ? "Confirmado" : "Sin confirmar"}
        </span>
      </p>
      {requested || account.pendingEmail ? (
        <p className="account-note" role="status">
          Te mandamos un link a <strong className="account-email">{requested ?? account.pendingEmail}</strong> para
          confirmar el cambio. Hasta que lo abras seguís entrando con {account.email}.
        </p>
      ) : null}
      {!account.hasPassword ? (
        <p className="account-note">Tu email viene de la cuenta con la que entrás, así que se cambia desde ahí.</p>
      ) : editing ? (
        <form className="account-form" onSubmit={submit}>
          <div className="field">
            <label className="field-label" htmlFor={`${id}-email`}>
              Email nuevo
            </label>
            <input
              id={`${id}-email`}
              className="input"
              type="email"
              name="newEmail"
              autoComplete="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </div>
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
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="account-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Enviando…" : "Mandar el link"}
            </button>
          </div>
        </form>
      ) : (
        <div className="account-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Cambiar el email
          </button>
        </div>
      )}
    </section>
  );
}
