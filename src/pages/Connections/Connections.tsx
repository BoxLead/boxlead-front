import { useEffect, useState } from "react";
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
  useDocumentTitle("Conexiones");

  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const connections = useApiQuery<AccountConnectionResponse[]>(CONNECTIONS_KEY);
  const { connect, connecting, error: connectError, clearError } = useConnectPlatform({
    onConnected: (platform) => toast({ message: `Conectaste ${getPlatform(platform).name}.` }),
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
      toast({ tone: "info", message: `Desconectaste ${pendingRemoval.displayName ?? getPlatform(pendingRemoval.platform).name}.` });
      setPendingRemoval(null);
    } catch (e) {
      setRemoveError(e instanceof ApiError ? e.message : "No pudimos desconectar la cuenta.");
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
          <h1 className="page-title">Conexiones</h1>
          <p className="page-header-desc">
            Conectá tus canales y cada consulta llega a tu bandeja, lista para responder.
          </p>
        </div>
        {connections.data ? (
          <p className="connections-count">
            <strong>{connectedCount}</strong> de {CONNECTABLE_PLATFORMS.length} canales conectados
          </p>
        ) : null}
      </header>

      <div className="connections-alerts">
        {needsReconnection.map((account) => (
          <Banner
            key={account.id}
            tone="warning"
            title={`Reconectá ${account.displayName ?? getPlatform(account.platform).name}`}
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={connecting !== null}
                onClick={() => void connect(account.platform)}
              >
                Reconectar
              </button>
            }
          >
            {getPlatform(account.platform).name} revocó o venció la autorización. Mientras tanto no llegan
            mensajes nuevos ni se pueden enviar respuestas.
          </Banner>
        ))}
        {error ? (
          <Banner
            tone="danger"
            title="Algo salió mal"
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
                Reintentar
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
        <ul className="channel-grid" aria-label="Canales">
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
        open={pendingRemoval !== null}
        title={`¿Desconectar ${pendingRemoval?.displayName ?? "esta cuenta"}?`}
        confirmLabel={removing ? "Desconectando…" : "Desconectar"}
        tone="danger"
        busy={removing}
        onConfirm={() => void confirmRemoval()}
        onCancel={() => setPendingRemoval(null)}
      >
        <p>
          Dejan de llegar los mensajes nuevos de esta cuenta de{" "}
          {pendingRemoval ? getPlatform(pendingRemoval.platform).name : ""}.
        </p>
        <p>Las conversaciones y los leads que ya están en BoxLead se conservan.</p>
      </ConfirmDialog>
    </div>
  );
}
