import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import type { LegalVersion } from "../api/types";
import {
  SOCIAL_AUTH_ENABLED,
  SOCIAL_PROVIDERS,
  socialRedirectUri,
  type SocialProvider,
} from "../util/social";

export function useSocialLogin() {
  const { loginWithRedirect } = useAuth0();

  const start = useCallback(
    (provider: SocialProvider, next: string, acceptedLegal?: LegalVersion[]) =>
      loginWithRedirect({
        authorizationParams: { connection: provider.connection, redirect_uri: socialRedirectUri(window.location.origin) },
        appState: acceptedLegal ? { next, acceptedLegal } : { next },
      }),
    [loginWithRedirect],
  );

  return {
    enabled: SOCIAL_AUTH_ENABLED,
    providers: SOCIAL_PROVIDERS,
    start,
  };
}
