import { useId, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AccountView } from "../../api/types";
import { peekReauthToken } from "../../data/reauth";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const DELETE_PARAM = "borrar";

export function DeleteAccountSection({ account }: { account: AccountView }) {
  const id = useId();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get(DELETE_PARAM) === "1" && peekReauthToken() !== null);

  return (
    <section className="panel account-section account-danger" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="panel-title">
        Borrar la cuenta
      </h2>
      <p className="account-note">
        Borramos tus conexiones, leads, conversaciones y agentes, y no se pueden recuperar. Guardamos solo lo que la ley
        nos pide conservar, como facturas y pagos.
      </p>
      <div className="account-actions">
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          Borrar la cuenta
        </button>
      </div>
      {open ? <DeleteAccountDialog account={account} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
