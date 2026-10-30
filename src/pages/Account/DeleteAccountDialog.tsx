import type { TFunction } from "i18next";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
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

function failureOf(t: TFunction<"account">, error: unknown): Failure {
  const code = apiErrorCode(error);
  if (code === "WRONG_PASSWORD") return { message: t("wrongPassword") };
  if (code === "REAUTHENTICATION_REQUIRED") {
    return { message: t("deletion.reauthRequired") };
  }
  if (code === "CONFIRMATION_MISMATCH") return { message: t("deletion.wordMismatch", { word: CONFIRMATION_WORD }) };
  if (code === "SUBSCRIPTION_OPEN") {
    return { message: t("deletion.subscriptionOpen"), billing: true };
  }
  if (code === "RESELLER_ACTIVE" || code === "ADMIN_ACTIVE") {
    return { message: t("deletion.manual", { email: SUPPORT_EMAIL }) };
  }
  if (error instanceof ApiError && error.status === 429) return { message: error.message };
  return { message: t("deletion.failed") };
}

export function DeleteAccountDialog({ account, onClose }: { account: AccountView; onClose: () => void }) {
  const { t } = useTranslation("account");
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
      setFailure(failureOf(t, error));
      setBusy(false);
    }
  }

  function close() {
    clearReauthToken();
    onClose();
  }

  return (
    <Dialog open title={t("deletion.dialogTitle")} busy={busy} onClose={close}>
      <form className="account-form" onSubmit={submit}>
        <ul className="account-delete-list">
          <li>{t("deletion.connections")}</li>
          <li>{t("deletion.data")}</li>
          <li>{t("deletion.kept")}</li>
          <li>{t("deletion.final")}</li>
        </ul>
        {account.hasPassword ? (
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        ) : reauthToken ? (
          <p className="account-note" role="status">
            {t("deletion.proven")}
          </p>
        ) : (
          <div className="field">
            <span className="field-label">{t("deletion.prove")}</span>
            <div className="account-actions account-actions-start">
              {providers.map((provider) => (
                <a key={provider.id} className="btn btn-secondary" href={`${REAUTH_PATH}?proveedor=${provider.id}`}>
                  {t("deletion.signInWith", { provider: provider.name })}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label className="field-label" htmlFor={`${id}-confirmation`}>
            {t("deletion.typeWord", { word: CONFIRMATION_WORD })}
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
                <Link to="/baja">{t("deletion.requestCancellation")}</Link>
              </>
            ) : null}
          </p>
        ) : null}
        <div className="account-actions">
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn btn-danger" disabled={!ready || busy}>
            {busy ? t("deletion.deleting") : t("deletion.submit")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
