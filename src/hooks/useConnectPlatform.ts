import i18next from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type {
  AccountConnectionResponse,
  AuthUrlResponse,
  PlatformType,
  WhatsAppConfig,
} from "../api/types";
import { invalidateQueries } from "../data/queryCache";
import { getPlatform } from "../platforms";
import {
  isWhatsAppSignupEvent,
  launchWhatsAppSignup,
  loadFacebookSdk,
  whatsAppSignupOutcome,
  type WhatsAppSignupEvent,
} from "../util/facebook-sdk";
import { beginOAuthRedirect, isFacebookOrigin, redirectUriFor } from "../util/oauth";

export const CONNECTIONS_KEY = "/oauth/connections";

class ConnectError extends Error {}

function metaError(message: string): ConnectError {
  return new ConnectError(i18next.t("connect.whatsappError", { ns: "connections", message }));
}

type Options = {
  onConnected?: (platform: PlatformType) => void;
};

export function useConnectPlatform({ onConnected }: Options = {}) {
  const [connecting, setConnecting] = useState<PlatformType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signup = useRef<WhatsAppSignupEvent | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isFacebookOrigin(event.origin) || typeof event.data !== "string") return;
      try {
        const data: unknown = JSON.parse(event.data);
        if (isWhatsAppSignupEvent(data)) signup.current = data;
      } catch {
        return;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const connectWhatsApp = useCallback(async () => {
    const config = await api.get<Partial<WhatsAppConfig>>("/oauth/whatsapp/config");
    if (!config.appId || !config.configId) {
      throw new ConnectError(i18next.t("connect.whatsappDisabled", { ns: "connections" }));
    }
    signup.current = null;
    await loadFacebookSdk(config.appId);
    let code: string;
    try {
      code = await launchWhatsAppSignup(config.configId);
    } catch {
      const failed = whatsAppSignupOutcome(signup.current);
      if (failed.kind === "error") throw metaError(failed.message);
      throw new ConnectError(i18next.t("connect.whatsappClosed", { ns: "connections" }));
    }
    const outcome = whatsAppSignupOutcome(signup.current);
    if (outcome.kind === "error") throw metaError(outcome.message);
    if (outcome.kind === "no-number") {
      throw new ConnectError(i18next.t("connect.whatsappOnlyWaba", { ns: "connections" }));
    }
    if (outcome.kind === "missing") {
      throw new ConnectError(i18next.t("connect.whatsappNoNumber", { ns: "connections" }));
    }
    await api.post<AccountConnectionResponse[]>("/oauth/WHATSAPP/callback", {
      code,
      phoneNumberId: outcome.phoneNumberId,
      wabaId: outcome.wabaId,
      phoneNumberRegistered: outcome.phoneNumberRegistered,
    });
  }, []);

  const connect = useCallback(
    async (platform: PlatformType) => {
      const definition = getPlatform(platform);
      setError(null);
      setConnecting(platform);
      try {
        if (definition.connect === "whatsapp-embedded") {
          await connectWhatsApp();
          await invalidateQueries(CONNECTIONS_KEY);
          onConnected?.(platform);
          setConnecting(null);
          return;
        }
        const redirectUri = redirectUriFor(platform);
        const auth = await api.get<AuthUrlResponse>(
          `/oauth/${platform}/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`,
        );
        beginOAuthRedirect(auth.url, auth.codeVerifier);
      } catch (e) {
        setError(
          e instanceof ApiError || e instanceof ConnectError
            ? e.message
            : i18next.t("connect.failed", { ns: "connections", name: definition.name }),
        );
        setConnecting(null);
      }
    },
    [connectWhatsApp, onConnected],
  );

  const clearError = useCallback(() => setError(null), []);

  return { connect, connecting, error, clearError };
}
