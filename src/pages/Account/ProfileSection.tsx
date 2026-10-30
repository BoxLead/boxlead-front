import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountView } from "../../api/types";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/auth";
import { renameAccount } from "../../data/account";
import { AccountRow } from "./AccountRow";

const MAX_NAME_LENGTH = 100;

export function ProfileSection({ account }: { account: AccountView }) {
  const { t } = useTranslation("account");
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
      toast({ message: t("name.saved") });
    } catch {
      setError(t("name.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountRow title={t("name.title")} description={t("name.description")}>
      <form className="account-form" onSubmit={save}>
        <div className="account-inline">
          <label className="visually-hidden" htmlFor={inputId}>
            {t("name.title")}
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
            {saving ? t("saving") : t("save")}
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
