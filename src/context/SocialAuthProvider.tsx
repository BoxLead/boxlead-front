import type { ReactNode } from "react";
import { Auth0Provider } from "@auth0/auth0-react";
import {
  SOCIAL_AUTH_CLIENT_ID,
  SOCIAL_AUTH_DOMAIN,
  SOCIAL_AUTH_ENABLED,
  socialRedirectUri,
} from "../util/social";

export function SocialAuthProvider({ children }: { children: ReactNode }) {
  if (!SOCIAL_AUTH_ENABLED || !SOCIAL_AUTH_DOMAIN || !SOCIAL_AUTH_CLIENT_ID) {
    return children;
  }

  return (
    <Auth0Provider
      domain={SOCIAL_AUTH_DOMAIN}
      clientId={SOCIAL_AUTH_CLIENT_ID}
      authorizationParams={{ redirect_uri: socialRedirectUri(window.location.origin) }}
      skipRedirectCallback
    >
      {children}
    </Auth0Provider>
  );
}
