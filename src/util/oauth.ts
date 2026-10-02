import type { PlatformType } from "../api/types";

const STATE_KEY = "oauth_state";
const VERIFIER_KEY = "oauth_code_verifier";

export function redirectUriFor(platform: PlatformType): string {
  return `${window.location.origin}/app/oauth/callback/${platform}`;
}

export function isFacebookOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return (
      protocol === "https:" &&
      (hostname === "facebook.com" || hostname.endsWith(".facebook.com"))
    );
  } catch {
    return false;
  }
}

export function beginOAuthRedirect(
  authUrl: string,
  codeVerifier?: string,
): void {
  const url = new URL(authUrl);
  if (url.protocol !== "https:") {
    throw new Error("La dirección de autorización no es segura.");
  }

  let state = url.searchParams.get("state");
  if (!state) {
    state = crypto.randomUUID();
    url.searchParams.set("state", state);
  }

  sessionStorage.setItem(STATE_KEY, state);
  if (codeVerifier) {
    sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
  } else {
    sessionStorage.removeItem(VERIFIER_KEY);
  }
  window.location.assign(url.toString());
}

export function consumeOAuthSession(returnedState: string | null): {
  valid: boolean;
  codeVerifier?: string;
} {
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY) ?? undefined;
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  return {
    valid: expectedState !== null && expectedState === returnedState,
    codeVerifier,
  };
}
