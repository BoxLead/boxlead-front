import type { TFunction } from "i18next";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { AccountView } from "../../api/types";
import { useToast } from "../../components/ui/toast";
import { changePassword } from "../../data/account";
import { AccountRow } from "./AccountRow";

const MIN_PASSWORD_LENGTH = 8;

function passwordError(t: TFunction<"account">, error: unknown): string {
  if (apiErrorCode(error) === "WRONG_PASSWORD") return t("password.wrongCurrent");
  if (error instanceof ApiError && error.status === 429) return error.message;
  if (error instanceof ApiError && error.status === 400) {
    return t("password.tooShort", { min: MIN_PASSWORD_LENGTH });
  }
  return t("password.failed");
}

export function SignInSection({ account }: { account: AccountView }) {
  const { t } = useTranslation("account");
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
      toast({ message: t("password.saved") });
    } catch (failure) {
      setError(passwordError(t, failure));
    } finally {
      setSaving(false);
    }
  }

  if (!account.hasPassword) {
    return (
      <AccountRow
        title={t("password.title")}
        description={t("password.none")}
      />
    );
  }

  return (
    <AccountRow
      title={t("password.title")}
      description={t("password.description")}
      action={
        editing ? null : (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            {t("password.change")}
          </button>
        )
      }
    >
      {editing ? (
        <form className="account-form" onSubmit={submit}>
          <div className="account-fields">
            <div className="field">
              <label className="field-label" htmlFor={`${id}-current`}>
                {t("password.current")}
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
                {t("password.next")}
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
                {t("password.hint", { min: MIN_PASSWORD_LENGTH })}
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
              {t("cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("saving") : t("password.save")}
            </button>
          </div>
        </form>
      ) : null}
    </AccountRow>
  );
}
