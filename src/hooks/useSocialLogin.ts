import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  SOCIAL_AUTH_ENABLED,
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from "../util/social";

export function useSocialLogin() {
  const { loginWithRedirect } = useAuth0();

  const start = useCallback(
    (provider: SocialProvider, next: string) =>
      loginWithRedirect({
        authorizationParams: { connection: provider.connection },
        appState: { next },
      }),
    [loginWithRedirect],
  );

  return {
    enabled: SOCIAL_AUTH_ENABLED,
    providers: SOCIAL_PROVIDERS,
    start,
  };
}
