declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            version: string;
            setup: Record<string, unknown>;
            featureType: string;
            sessionInfoVersion: string;
          };
        },
      ) => void;
    };
  }
}

export type FBLoginResponse = {
  authResponse?: {
    code: string;
    accessToken?: string;
    userID?: string;
  };
  status?: string;
};

export type WhatsAppSignupEventName =
  | "FINISH"
  | "FINISH_ONLY_WABA"
  | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
  | "FINISH_GRANT_ONLY_API_ACCESS"
  | "CANCEL"
  | "ERROR";

export type WhatsAppSignupEvent = {
  data: {
    phone_number_id?: string;
    waba_id?: string;
    business_id?: string;
    current_step?: string;
    error_message?: string;
    error_code?: string | number;
    session_id?: string;
  };
  type: "WA_EMBEDDED_SIGNUP";
  event: WhatsAppSignupEventName | string;
};

export type WhatsAppSignupOutcome =
  | { kind: "number"; phoneNumberId?: string; wabaId: string; phoneNumberRegistered: boolean }
  | { kind: "no-number" }
  | { kind: "error"; message: string }
  | { kind: "missing" };

const GRAPH_API_VERSION = "v22.0";
const EMBEDDED_SIGNUP_VERSION = "v4";
const BUSINESS_APP_EVENT: WhatsAppSignupEventName = "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
const BUSINESS_APP_FEATURE = "whatsapp_business_app_onboarding";
const SESSION_INFO_VERSION = "3";

let sdkLoadPromise: Promise<void> | null = null;

export function isWhatsAppSignupEvent(data: unknown): data is WhatsAppSignupEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "WA_EMBEDDED_SIGNUP" &&
    typeof (data as { event?: unknown }).event === "string"
  );
}

export function whatsAppSignupOutcome(event: WhatsAppSignupEvent | null): WhatsAppSignupOutcome {
  if (!event) return { kind: "missing" };
  if (event.event === "ERROR") {
    const code = event.data.error_code != null ? ` (${event.data.error_code})` : "";
    return { kind: "error", message: `${event.data.error_message ?? ""}${code}`.trim() };
  }
  if (event.event === "FINISH_ONLY_WABA") return { kind: "no-number" };
  const phoneNumberId = event.data.phone_number_id;
  const wabaId = event.data.waba_id;
  const onBusinessApp = event.event === BUSINESS_APP_EVENT;
  if (!event.event.startsWith("FINISH") || !wabaId || (!phoneNumberId && !onBusinessApp)) return { kind: "missing" };
  return { kind: "number", phoneNumberId, wabaId, phoneNumberRegistered: onBusinessApp };
}

export function loadFacebookSdk(appId: string): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve) => {
    window.fbAsyncInit = () => {
      window.FB!.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: GRAPH_API_VERSION,
      });
      resolve();
    };

    if (window.FB) {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: GRAPH_API_VERSION,
      });
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

export function launchWhatsAppSignup(configId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK not loaded"));
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          resolve(response.authResponse.code);
        } else {
          reject(new Error("WhatsApp signup was cancelled or failed"));
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          version: EMBEDDED_SIGNUP_VERSION,
          setup: {},
          featureType: BUSINESS_APP_FEATURE,
          sessionInfoVersion: SESSION_INFO_VERSION,
        },
      },
    );
  });
}
