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
  launchWhatsAppSignup,
  loadFacebookSdk,
  type WhatsAppSignupEvent,
} from "../util/facebook-sdk";
import { beginOAuthRedirect, isFacebookOrigin, redirectUriFor } from "../util/oauth";

export const CONNECTIONS_KEY = "/oauth/connections";

type SignupData = { phoneNumberId?: string; wabaId?: string };

class ConnectError extends Error {}

type Options = {
  onConnected?: (platform: PlatformType) => void;
};

export function useConnectPlatform({ onConnected }: Options = {}) {
  const [connecting, setConnecting] = useState<PlatformType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signup = useRef<SignupData | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isFacebookOrigin(event.origin) || typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data) as WhatsAppSignupEvent;
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event !== "CANCEL") {
          signup.current = { phoneNumberId: data.data.phone_number_id, wabaId: data.data.waba_id };
        }
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
      throw new ConnectError("WhatsApp todavía no está habilitado en BoxLead.");
    }
    signup.current = null;
    await loadFacebookSdk(config.appId);
    let code: string;
    try {
      code = await launchWhatsAppSignup(config.configId);
    } catch {
      throw new ConnectError("Cerraste el alta de WhatsApp antes de terminar.");
    }
    const received = signup.current as SignupData | null;
    const phoneNumberId = received?.phoneNumberId;
    const wabaId = received?.wabaId;
    if (!phoneNumberId || !wabaId) {
      throw new ConnectError("El alta terminó pero no recibimos el número elegido. Probá de nuevo.");
    }
    await api.post<AccountConnectionResponse[]>("/oauth/WHATSAPP/callback", {
      code,
      phoneNumberId,
      wabaId,
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
            : `No pudimos conectar ${definition.name}.`,
        );
        setConnecting(null);
      }
    },
    [connectWhatsApp, onConnected],
  );

  const clearError = useCallback(() => setError(null), []);

  return { connect, connecting, error, clearError };
}
