import { type FormEvent, useId, useState } from "react";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { AccountView } from "../../api/types";
import { useToast } from "../../components/ui/toast";
import { changePassword } from "../../data/account";
import { AccountRow } from "./AccountRow";

const MIN_PASSWORD_LENGTH = 8;

function passwordError(error: unknown): string {
  if (apiErrorCode(error) === "WRONG_PASSWORD") return "La contraseña actual no es correcta.";
  if (error instanceof ApiError && error.status === 429) return error.message;
  if (error instanceof ApiError && error.status === 400) {
    return `La contraseña nueva tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return "No pudimos cambiar la contraseña. Probá de nuevo.";
}

export function SignInSection({ account }: { account: AccountView }) {
  const id = useId();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      setEditing(false);
      setCurrent("");
      setNext("");
      toast({ message: "Cambiaste tu contraseña y cerramos las sesiones de los otros dispositivos." });
    } catch (failure) {
      setError(passwordError(failure));
    } finally {
      setSaving(false);
    }
  }

  if (!account.hasPassword) {
    return (
      <AccountRow
        title="Contraseña"
        description="Tu cuenta no tiene contraseña. Entrás con el mismo botón con el que la creaste."
      />
    );
  }

  return (
    <AccountRow
      title="Contraseña"
      description="Al cambiarla cerramos las sesiones de los otros dispositivos."
      action={
        editing ? null : (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Cambiar la contraseña
          </button>
        )
      }
    >
      {editing ? (
        <form className="account-form" onSubmit={submit}>
          <div className="account-fields">
            <div className="field">
              <label className="field-label" htmlFor={`${id}-current`}>
                Contraseña actual
              </label>
              <input
                id={`${id}-current`}
                className="input"
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor={`${id}-next`}>
                Contraseña nueva
              </label>
              <input
                id={`${id}-next`}
                className="input"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                aria-describedby={`${id}-hint`}
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
              <span id={`${id}-hint`} className="field-help">
                Al menos {MIN_PASSWORD_LENGTH} caracteres.
              </span>
            </div>
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
              {saving ? "Guardando…" : "Guardar la contraseña"}
            </button>
          </div>
        </form>
      ) : null}
    </AccountRow>
  );
}
