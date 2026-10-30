import i18next from "i18next";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { AccountConnectionResponse, PlatformType } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { invalidateQueries } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { CONNECTIONS_KEY, useConnectPlatform } from "../../hooks/useConnectPlatform";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { CONNECTABLE_PLATFORMS, getPlatform } from "../../platforms";
import { ChannelCard } from "./ChannelCard";
import "./Connections.css";

const FEATURED: PlatformType = "MELI";
const HIGHLIGHT_MS = 2400;

function connectedFrom(state: unknown): PlatformType | null {
  if (!state || typeof state !== "object" || !("connected" in state)) return null;
  const match = CONNECTABLE_PLATFORMS.find((p) => p.id === state.connected);
  return match ? match.id : null;
}

export function Connections() {
  const { t } = useTranslation("connections");
  useDocumentTitle(t("page.title"));

  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const connections = useApiQuery<AccountConnectionResponse[]>(CONNECTIONS_KEY);
  const { connect, connecting, error: connectError, clearError } = useConnectPlatform({
    onConnected: (platform) => toast({ message: t("page.connected", { name: getPlatform(platform).name }) }),
  });
  const [highlighted, setHighlighted] = useState(() => connectedFrom(location.state));
  const [pendingRemoval, setPendingRemoval] = useState<AccountConnectionResponse | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!highlighted) return;
    navigate(location.pathname, { replace: true, state: null });
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted, location.pathname, navigate]);

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await api.delete(`/oauth/connections/${pendingRemoval.id}`);
      await invalidateQueries(CONNECTIONS_KEY);
      toast({ tone: "info", message: t("page.disconnected", { name: pendingRemoval.displayName ?? getPlatform(pendingRemoval.platform).name }) });
      setPendingRemoval(null);
    } catch (e) {
      setRemoveError(e instanceof ApiError ? e.message : t("page.disconnectFailed"));
    } finally {
      setRemoving(false);
    }
  }

  const list = connections.data ?? [];
  const needsReconnection = list.filter((c) => c.needsReconnection);
  const connectedCount = CONNECTABLE_PLATFORMS.filter((p) => list.some((c) => c.platform === p.id)).length;
  const error = connectError ?? removeError ?? (connections.data ? null : connections.error);

  return (
    <div className="page connections-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("page.title")}</h1>
          <p className="page-header-desc">{t("page.description")}</p>
        </div>
        {connections.data ? (
          <p className="connections-count">
            <Trans
              t={t}
              i18nKey="page.count"
              values={{ connected: connectedCount, total: CONNECTABLE_PLATFORMS.length }}
              components={{ strong: <strong /> }}
            />
          </p>
        ) : null}
      </header>

      <div className="connections-alerts">
        {needsReconnection.map((account) => (
          <Banner
            key={account.id}
            tone="warning"
            title={t("page.reconnectTitle", { name: account.displayName ?? getPlatform(account.platform).name })}
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={connecting !== null}
                onClick={() => void connect(account.platform)}
              >
                {t("page.reconnect")}
              </button>
            }
          >
            {t("page.reconnectBody", { name: getPlatform(account.platform).name })}
          </Banner>
        ))}
        {error ? (
          <Banner
            tone="danger"
            title={t("page.errorTitle")}
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  clearError();
                  setRemoveError(null);
                  void connections.reload();
                }}
              >
                {t("page.retry")}
              </button>
            }
          >
            {error}
          </Banner>
        ) : null}
      </div>

      {connections.loading ? (
        <div className="channel-grid" aria-hidden="true">
          <div className="skeleton channel-skeleton channel-skeleton-featured" />
          <div className="skeleton channel-skeleton" />
          <div className="skeleton channel-skeleton" />
          <div className="skeleton channel-skeleton" />
        </div>
      ) : (
        <ul className="channel-grid rise-list" aria-label={t("page.channels")}>
          {CONNECTABLE_PLATFORMS.map((platform) => (
            <ChannelCard
              key={platform.id}
              platform={platform}
              accounts={list.filter((c) => c.platform === platform.id)}
              featured={platform.id === FEATURED}
              highlighted={highlighted === platform.id}
              connecting={connecting}
              onConnect={(id) => void connect(id)}
              onDisconnect={(account) => {
                setRemoveError(null);
                setPendingRemoval(account);
              }}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        cancelLabel={i18next.t("ui.cancel", { ns: "shell" })}
        open={pendingRemoval !== null}
        title={t("page.disconnectTitle", { name: pendingRemoval?.displayName ?? t("page.disconnectFallbackName") })}
        confirmLabel={removing ? t("page.disconnecting") : t("page.disconnect")}
        tone="danger"
        busy={removing}
        onConfirm={() => void confirmRemoval()}
        onCancel={() => setPendingRemoval(null)}
      >
        <p>{t("page.disconnectBody", { name: pendingRemoval ? getPlatform(pendingRemoval.platform).name : "" })}</p>
        <p>{t("page.disconnectKeeps")}</p>
      </ConfirmDialog>
    </div>
  );
}
