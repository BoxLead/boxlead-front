import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api/client";
import type {
  AccountConnectionResponse,
  PlatformType,
  WhatsAppConfig,
} from "../../api/types";
import { PlatformBadge } from "../../components/PlatformBadge/PlatformBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import {
  loadFacebookSdk,
  launchWhatsAppSignup,
  type WhatsAppSignupEvent,
} from "../../util/facebook-sdk";
import { formatShortDate } from "../../util/format";
import { platformLabel } from "../../util/labels";
import {
  beginOAuthRedirect,
  isFacebookOrigin,
  redirectUriFor,
} from "../../util/oauth";
import "./Connections.css";

type Channel = {
  platform: PlatformType;
  description: string;
};

const CHANNELS: Channel[] = [
  { platform: "WHATSAPP", description: "Mensajes de WhatsApp Business." },
  { platform: "INSTAGRAM", description: "Mensajes directos y comentarios." },
  { platform: "META", description: "Mensajes de tu página de Facebook." },
  { platform: "MELI", description: "Preguntas de tus publicaciones." },
];

type SignupData = {
  phone_number_id?: string;
  waba_id?: string;
};

export function Connections() {
  useDocumentTitle("Conexiones");

  const connections =
    useApiQuery<AccountConnectionResponse[]>("/oauth/connections");
  const waConfig = useApiQuery<WhatsAppConfig>("/oauth/whatsapp/config");
  const [actionError, setActionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<PlatformType | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const signupDataRef = useRef<SignupData | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isFacebookOrigin(event.origin)) return;
      try {
        const data = JSON.parse(event.data) as WhatsAppSignupEvent;
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event !== "CANCEL") {
          signupDataRef.current = {
            phone_number_id: data.data.phone_number_id,
            waba_id: data.data.waba_id,
          };
        }
      } catch {
        return;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function connectWithRedirect(platform: PlatformType) {
    const uri = redirectUriFor(platform);
    const res = await api.get<{ url: string; codeVerifier?: string }>(
      `/oauth/${platform}/auth-url?redirectUri=${encodeURIComponent(uri)}`,
    );
    beginOAuthRedirect(res.url, res.codeVerifier);
  }

  async function connectWhatsApp(config: WhatsAppConfig) {
    signupDataRef.current = null;
    await loadFacebookSdk(config.appId);
    const code = await launchWhatsAppSignup(config.configId);
    const signupData = signupDataRef.current as SignupData | null;
    const phoneNumberId = signupData?.phone_number_id;
    const wabaId = signupData?.waba_id;

    if (!phoneNumberId || !wabaId) {
      setActionError(
        "El alta de WhatsApp terminó, pero no recibimos los datos de la cuenta. Probá de nuevo.",
      );
      return;
    }

    await api.post<AccountConnectionResponse[]>("/oauth/WHATSAPP/callback", {
      code,
      redirectUri: "",
      phoneNumberId,
      wabaId,
    });
    connections.reload();
  }

  async function handleConnect(platform: PlatformType) {
    setActionError(null);
    setConnecting(platform);
    try {
      if (platform === "WHATSAPP") {
        if (!waConfig.data) {
          setActionError("WhatsApp todavía no está configurado.");
          return;
        }
        await connectWhatsApp(waConfig.data);
      } else {
        await connectWithRedirect(platform);
      }
    } catch (e) {
      setActionError(
        e instanceof ApiError
          ? e.message
          : `No pudimos conectar ${platformLabel(platform)}.`,
      );
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(id: string) {
    setRemovingId(id);
    setActionError(null);
    try {
      await api.delete(`/oauth/connections/${id}`);
      connections.reload();
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : "No pudimos desconectar la cuenta.",
      );
    } finally {
      setRemovingId(null);
      setConfirmId(null);
    }
  }

  const list = connections.data ?? [];
  const error = actionError ?? connections.error;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Conexiones</h1>
          <p className="page-header-desc">
            Conectá tus canales para que los mensajes lleguen a tu bandeja.
          </p>
        </div>
      </header>

      {error ? (
        <div className="page-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="conn-section">
        <h2 className="panel-title">Canales</h2>
        <ul className="conn-channels">
          {CHANNELS.map(({ platform, description }) => {
            const count = list.filter((c) => c.platform === platform).length;
            const unavailable = platform === "WHATSAPP" && !waConfig.data;
            return (
              <li key={platform} className="panel conn-channel">
                <div className="conn-channel-head">
                  <PlatformBadge platform={platform} iconOnly />
                  <div>
                    <h3 className="conn-channel-name">
                      {platformLabel(platform)}
                    </h3>
                    <p className="conn-channel-desc">{description}</p>
                  </div>
                </div>
                <div className="conn-channel-foot">
                  <span
                    className={`conn-channel-state${count > 0 ? " conn-channel-state-on" : ""}`}
                  >
                    {count === 0
                      ? "Sin conectar"
                      : count === 1
                        ? "1 cuenta conectada"
                        : `${count} cuentas conectadas`}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm ${count > 0 ? "btn-secondary" : "btn-primary"}`}
                    disabled={connecting !== null || unavailable}
                    onClick={() => void handleConnect(platform)}
                  >
                    {connecting === platform
                      ? "Conectando…"
                      : count > 0
                        ? "Agregar otra"
                        : "Conectar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="conn-section">
        <h2 className="panel-title">Cuentas conectadas</h2>
        {connections.loading ? (
          <div className="conn-skeleton skeleton" aria-hidden="true" />
        ) : list.length === 0 ? (
          <p className="panel conn-empty">
            Todavía no conectaste ninguna cuenta.
          </p>
        ) : (
          <ul className="panel conn-list">
            {list.map((c) => (
              <li key={c.id} className="conn-row">
                <PlatformBadge platform={c.platform} iconOnly />
                <div className="conn-row-main">
                  <span className="conn-name">
                    {c.displayName ?? c.externalAccountId}
                  </span>
                  <span className="conn-meta">
                    {platformLabel(c.platform)} · Conectada el{" "}
                    {formatShortDate(c.connectedAt)}
                  </span>
                </div>
                {confirmId === c.id ? (
                  <div className="conn-confirm">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={removingId === c.id}
                      onClick={() => void handleDisconnect(c.id)}
                    >
                      {removingId === c.id ? "Quitando…" : "Sí, desconectar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={removingId === c.id}
                      onClick={() => setConfirmId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setConfirmId(c.id)}
                  >
                    Desconectar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
