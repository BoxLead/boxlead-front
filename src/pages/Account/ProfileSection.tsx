import { type FormEvent, useId, useState } from "react";
import type { AccountView } from "../../api/types";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/auth";
import { renameAccount } from "../../data/account";
import { AccountRow } from "./AccountRow";

const MAX_NAME_LENGTH = 100;

export function ProfileSection({ account }: { account: AccountView }) {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const inputId = useId();
  const [name, setName] = useState(account.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unchanged = name.trim() === (account.name ?? "");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await renameAccount(name.trim());
      await refreshUser().catch(() => undefined);
      toast({ message: "Guardaste tu nombre." });
    } catch {
      setError("No pudimos guardar tu nombre. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountRow title="Nombre" description="Así te mostramos en BoxLead y en los mails que te mandamos.">
      <form className="account-form" onSubmit={save}>
        <div className="account-inline">
          <label className="visually-hidden" htmlFor={inputId}>
            Nombre
          </label>
          <input
            id={inputId}
            className="input"
            name="name"
            autoComplete="name"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={saving || unchanged}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </AccountRow>
  );
}
