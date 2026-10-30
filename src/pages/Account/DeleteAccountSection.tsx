import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import type { AccountView } from "../../api/types";
import { peekReauthToken } from "../../data/reauth";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const DELETE_PARAM = "borrar";

export function DeleteAccountSection({ account }: { account: AccountView }) {
  const { t } = useTranslation("account");
  const id = useId();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get(DELETE_PARAM) === "1" && peekReauthToken() !== null);

  return (
    <section className="panel account-group account-danger" aria-labelledby={id}>
      <div className="account-group-head">
        <div className="account-group-text">
          <h2 id={id} className="panel-title">
            {t("deletion.title")}
          </h2>
          <p className="account-group-desc">{t("deletion.description")}</p>
        </div>
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          {t("deletion.title")}
        </button>
      </div>
      {open ? <DeleteAccountDialog account={account} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
