import { useEffect, useRef } from "react";
import type { AccountConnectionResponse, PlatformType } from "../../api/types";
import { CheckIcon } from "../../components/icons/UiIcons";
import { Tag } from "../../components/ui/Tag";
import type { PlatformDefinition } from "../../platforms";
import { AccountRow } from "./AccountRow";
import "./ChannelCard.css";

type ChannelCardProps = {
  platform: PlatformDefinition;
  accounts: AccountConnectionResponse[];
  featured: boolean;
  highlighted: boolean;
  connecting: PlatformType | null;
  onConnect: (platform: PlatformType) => void;
  onDisconnect: (account: AccountConnectionResponse) => void;
};

export function ChannelCard({
  platform,
  accounts,
  featured,
  highlighted,
  connecting,
  onConnect,
  onDisconnect,
}: ChannelCardProps) {
  const connected = accounts.length > 0;
  const needsAttention = accounts.some((a) => a.needsReconnection);
  const isConnecting = connecting === platform.id;
  const headingId = `channel-${platform.id}`;
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: "center" });
  }, [highlighted]);

  return (
    <li
      ref={ref}
      id={`canal-${platform.id.toLowerCase()}`}
      className={[
        "panel",
        "channel-card",
        `channel-card-${platform.id.toLowerCase()}`,
        featured ? "channel-card-featured" : "",
        highlighted ? "channel-card-highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={headingId}
    >
      <div className="channel-card-head">
        <span className="channel-card-logo">{platform.logo(28)}</span>
        <div className="channel-card-title">
          <h2 id={headingId}>{platform.name}</h2>
          <p>{platform.summary}</p>
        </div>
        {needsAttention || connected ? (
          <span className="channel-card-status">
            {needsAttention ? (
              <Tag tone="danger">Atención</Tag>
            ) : (
              <Tag tone="success" icon={<CheckIcon />}>
                Conectado
              </Tag>
            )}
          </span>
        ) : null}
      </div>

      {connected ? (
        <ul className="channel-card-accounts" aria-label={`Cuentas de ${platform.name}`}>
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              busy={connecting !== null}
              onReconnect={() => onConnect(platform.id)}
              onDisconnect={() => onDisconnect(account)}
            />
          ))}
        </ul>
      ) : (
        <div className="channel-card-intro">
          <div>
            <h3 className="channel-card-subtitle">Qué llega a BoxLead</h3>
            <ul className="channel-card-syncs">
              {platform.syncs.map((item) => (
                <li key={item}>
                  <CheckIcon width={16} height={16} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {featured ? (
            <div>
              <h3 className="channel-card-subtitle">Cómo funciona</h3>
              <ol className="channel-card-steps">
                {platform.howItWorks.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      )}

      <div className="channel-card-foot">
        <button
          type="button"
          className={`btn btn-sm ${connected ? "btn-secondary" : "btn-primary"}`}
          disabled={connecting !== null}
          onClick={() => onConnect(platform.id)}
        >
          {isConnecting
            ? "Conectando…"
            : connected
              ? platform.addAnother
              : `Conectar ${platform.name}`}
        </button>
      </div>
    </li>
  );
}
