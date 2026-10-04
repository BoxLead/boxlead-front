import type { AccountConnectionResponse } from "../../api/types";
import { Tag } from "../../components/ui/Tag";
import { AlertIcon } from "../../components/icons/UiIcons";
import { formatDate, formatRelative } from "../../util/format";
import "./AccountRow.css";

type AccountRowProps = {
  account: AccountConnectionResponse;
  busy: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
};

export function AccountRow({ account, busy, onReconnect, onDisconnect }: AccountRowProps) {
  const failures = account.failedEventCount ?? 0;
  const name = account.displayName ?? account.externalAccountId;

  return (
    <li className={`account-row${account.needsReconnection ? " account-row-alert" : ""}`}>
      <div className="account-row-main">
        <span className="account-row-name">{name}</span>
        <span className="account-row-meta">
          Conectada el {formatDate(account.connectedAt)}
          {account.lastEventAt ? ` · Última actividad ${formatRelative(account.lastEventAt)}` : null}
        </span>
        {account.needsReconnection || failures > 0 ? (
          <span className="account-row-tags">
            {account.needsReconnection ? (
              <Tag tone="danger" icon={<AlertIcon />}>
                Requiere reconexión
              </Tag>
            ) : null}
            {failures > 0 ? (
              <Tag tone="warning">
                {failures === 1
                  ? "1 notificación con error esta semana"
                  : `${failures} notificaciones con error esta semana`}
              </Tag>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="account-row-actions">
        {account.needsReconnection ? (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onReconnect}>
            Reconectar
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={onDisconnect}
          aria-label={`Desconectar ${name}`}
        >
          Desconectar
        </button>
      </div>
    </li>
  );
}
