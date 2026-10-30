import { type FormEvent, useId, useState } from "react";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { AccountView } from "../../api/types";
import { Tag } from "../../components/ui/Tag";
import { useAuth } from "../../context/auth";
import { ACCOUNT_KEY, changeEmail } from "../../data/account";
import { invalidateQueries } from "../../data/queryCache";
import { AccountRow } from "./AccountRow";

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
  const { user } = useAuth();
  const canChange = account.hasPassword && user?.account?.emailChange === true;
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState<string | null>(null);
  const pending = requested ?? account.pendingEmail;

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

  const description = !account.hasPassword
    ? "Viene de la cuenta con la que entrás, así que se cambia desde ahí."
    : "Es con el que entrás y donde te escribimos.";

  return (
    <AccountRow
      title="Email"
      description={description}
      action={
        canChange && !editing ? (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Cambiar el email
          </button>
        ) : null
      }
    >
      {editing ? (
        <form className="account-form" onSubmit={submit}>
          <div className="account-fields">
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
          </div>
          <p className="field-help">Te mandamos un link al email nuevo. Hasta que lo abras seguís entrando con {account.email}.</p>
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
        <p className="account-value">
          <span className="account-email">{account.email}</span>
          <Tag tone={account.emailVerified ? "success" : "warning"}>
            {account.emailVerified ? "Confirmado" : "Sin confirmar"}
          </Tag>
        </p>
      )}
      {pending ? (
        <p className="account-note" role="status">
          Te mandamos un link a <strong className="account-email">{pending}</strong> para confirmar el cambio. Hasta
          que lo abras seguís entrando con {account.email}.
        </p>
      ) : null}
    </AccountRow>
  );
}
