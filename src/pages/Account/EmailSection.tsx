import type { TFunction } from "i18next";
import { type FormEvent, useId, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { AccountView } from "../../api/types";
import { Tag } from "../../components/ui/Tag";
import { useAuth } from "../../context/auth";
import { ACCOUNT_KEY, changeEmail } from "../../data/account";
import { invalidateQueries } from "../../data/queryCache";
import { AccountRow } from "./AccountRow";

function emailError(t: TFunction<"account">, error: unknown): string {
  const code = apiErrorCode(error);
  if (code === "WRONG_PASSWORD") return t("wrongPassword");
  if (code === "SAME_EMAIL") return t("email.sameEmail");
  if (error instanceof ApiError && error.status === 429) return error.message;
  if (error instanceof ApiError && error.status === 400) return t("email.invalid");
  return t("email.failed");
}

export function EmailSection({ account }: { account: AccountView }) {
  const { t } = useTranslation("account");
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
      setError(emailError(t, failure));
    } finally {
      setSaving(false);
    }
  }

  const description = !account.hasPassword ? t("email.fromProvider") : t("email.description");

  return (
    <AccountRow
      title={t("email.title")}
      description={description}
      action={
        canChange && !editing ? (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            {t("email.change")}
          </button>
        ) : null
      }
    >
      {editing ? (
        <form className="account-form" onSubmit={submit}>
          <div className="account-fields">
            <div className="field">
              <label className="field-label" htmlFor={`${id}-email`}>
                {t("email.newEmail")}
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
                {t("yourPassword")}
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
          <p className="field-help">{t("email.help", { email: account.email })}</p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="account-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
              {t("cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("email.sending") : t("email.send")}
            </button>
          </div>
        </form>
      ) : (
        <p className="account-value">
          <span className="account-email">{account.email}</span>
          <Tag tone={account.emailVerified ? "success" : "warning"}>
            {account.emailVerified ? t("email.verified") : t("email.unverified")}
          </Tag>
        </p>
      )}
      {pending ? (
        <p className="account-note" role="status">
          <Trans
            t={t}
            i18nKey="email.pending"
            values={{ pending, email: account.email }}
            components={{ strong: <strong className="account-email" /> }}
          />
        </p>
      ) : null}
    </AccountRow>
  );
}
